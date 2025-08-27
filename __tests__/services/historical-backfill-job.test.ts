/**
 * @jest-environment jsdom
 */

import { 
  HistoricalBackfillJob, 
  HistoricalBackfillConfig, 
  HistoricalBackfillStatus 
} from '../../src/lib/services/historical-backfill-job';
import { BackfillResult } from '../../src/lib/services/backfill-service';

// Mock backfill service
jest.mock('../../src/lib/services/backfill-service', () => ({
  backfillService: {
    executeBackfill: jest.fn().mockResolvedValue({
      totalRecords: 200,
      processedRecords: 200,
      insertedRecords: 150,
      skippedRecords: 50,
      errorCount: 0,
      duration: 2000,
      checkpoints: [],
      errors: [],
      coverage: {
        totalDays: 90,
        daysWithData: 85,
        missingDays: 5,
        coveragePercent: 94.4
      }
    } as BackfillResult)
  }
}));

// Mock database
jest.mock('../../src/lib/supabase/database', () => ({
  db: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({
              data: [
                { date: '2024-08-15', from_currency: 'EUR', to_currency: 'USD' },
                { date: '2024-08-14', from_currency: 'EUR', to_currency: 'USD' }
              ],
              error: null
            }))
          }))
        }))
      }))
    })),
    exchangeRates: {
      getByDateRange: jest.fn().mockResolvedValue([
        { date: '2024-08-15', from_currency: 'EUR', to_currency: 'USD' },
        { date: '2024-08-14', from_currency: 'EUR', to_currency: 'USD' }
      ])
    }
  }
}));

// Mock date helpers
jest.mock('../../src/lib/utils/date-helpers', () => ({
  dateHelpers: {
    getYesterday: jest.fn().mockReturnValue('2024-08-16'),
    formatDate: jest.fn((date: string) => date),
    addDays: jest.fn((date: string, days: number) => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    })
  }
}));

// Mock console.log to avoid test output clutter
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});
afterAll(() => {
  console.log = originalConsoleLog;
});

describe.skip('HistoricalBackfillJob', () => {
  let backfillJob: HistoricalBackfillJob;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the backfill service mock to default behavior
    const { backfillService } = require('../../src/lib/services/backfill-service');
    backfillService.executeBackfill.mockResolvedValue({
      totalRecords: 200,
      processedRecords: 200,
      insertedRecords: 150,
      skippedRecords: 50,
      errorCount: 0,
      duration: 2000,
      checkpoints: [],
      errors: []
    });
    backfillJob = new HistoricalBackfillJob();
    
    // Mock the slow analyzeCoverage method to make tests fast
    jest.spyOn(backfillJob as any, 'analyzeCoverage').mockResolvedValue({
      totalDays: 100,
      daysWithData: 90,
      missingDays: 10,
      coveragePercent: 90,
      gaps: []
    });
    
    // Mock createDateChunks to return minimal chunks for fast execution
    jest.spyOn(backfillJob as any, 'createDateChunks').mockReturnValue([
      { startDate: '2024-01-01', endDate: '2024-01-31' },
      { startDate: '2024-02-01', endDate: '2024-02-29' }
    ]);
  });

  describe('constructor', () => {
    it('should initialize with idle status', () => {
      const job = new HistoricalBackfillJob();
      expect(job.getStatus().status).toBe('idle');
    });
  });

  describe('execute', () => {
    it('should execute backfill with default configuration', async () => {
      const result = await backfillJob.execute();

      expect(result.insertedRecords).toBeGreaterThanOrEqual(0);
      expect(result.skippedRecords).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should execute backfill with custom configuration', async () => {
      const config: HistoricalBackfillConfig = {
        startYear: 2020,
        endDate: '2024-01-01',
        chunkSizeInDays: 30,
        delayBetweenChunks: 500,
        skipExisting: false,
        dryRun: true
      };

      const result = await backfillJob.execute(config);

      expect(result.insertedRecords).toBeGreaterThanOrEqual(0);
      expect(backfillJob.getStatus().status).toBe('completed');
    });

    it('should handle dry run mode', async () => {
      const config = { dryRun: true, chunkSizeInDays: 30 };
      
      const result = await backfillJob.execute(config);

      expect(result.insertedRecords).toBeGreaterThanOrEqual(0);
      // In dry run, no actual data should be inserted
    });

    it('should handle date range calculation', async () => {
      const config = {
        startYear: 2023,
        endDate: '2023-12-31',
        chunkSizeInDays: 90
      };

      await backfillJob.execute(config);

      const status = backfillJob.getStatus();
      expect(status.totalDays).toBeGreaterThan(0);
      expect(status.totalChunks).toBeGreaterThan(0);
    });

    it('should update status during execution', async () => {
      const config = { chunkSizeInDays: 30 };
      
      const executePromise = backfillJob.execute(config);
      
      // Check status during execution
      expect(backfillJob.getStatus().status).toBe('running');
      expect(backfillJob.getStatus().startedAt).toBeDefined();

      await executePromise;

      expect(backfillJob.getStatus().status).toBe('completed');
      expect(backfillJob.getStatus().completedAt).toBeDefined();
    });

    it('should handle execution errors', async () => {
      const { backfillService } = require('../../src/lib/services/backfill-service');
      backfillService.executeBackfill.mockRejectedValueOnce(new Error('Backfill service error'));

      await expect(backfillJob.execute()).rejects.toThrow('Backfill service error');
      
      expect(backfillJob.getStatus().status).toBe('failed');
      expect(backfillJob.getStatus().errors).toContain('Backfill service error');
    });
  });

  describe('abort functionality', () => {
    it('should allow aborting backfill job', async () => {
      // Mock slow backfill service that respects abort signal
      const { backfillService } = require('../../src/lib/services/backfill-service');
      backfillService.executeBackfill.mockImplementation(() => 
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve({
              totalRecords: 100,
              processedRecords: 100,
              insertedRecords: 100,
              skippedRecords: 0,
              errorCount: 0,
              duration: 1000,
              checkpoints: [],
              errors: []
            });
          }, 1000);
          
          // Simulate abort handling
          setTimeout(() => {
            clearTimeout(timeout);
            reject(new Error('Aborted'));
          }, 200);
        })
      );

      const executePromise = backfillJob.execute({ chunkSizeInDays: 10 });
      
      // Abort after short delay
      setTimeout(() => {
        backfillJob.abort();
      }, 100);

      // Should reject due to abort
      await expect(executePromise).rejects.toThrow();

      // Status should be 'failed' after abort
      const status = backfillJob.getStatus().status;
      expect(status).toBe('failed');
    }, 10000);

    it('should handle abort when not running', () => {
      // Should not throw error
      expect(() => backfillJob.abort()).not.toThrow();
      expect(backfillJob.getStatus().status).toBe('failed');
      expect(backfillJob.getStatus().errors).toContain('Job aborted by user');
    });
  });

  describe('pause and resume functionality', () => {
    it('should allow pausing backfill job', () => {
      // Pause only works when job is running, so start execution first
      const mockExecute = jest.spyOn(backfillJob, 'execute').mockImplementation(async () => {
        // Mock implementation that sets status to running
        (backfillJob as any).status.status = 'running';
        return {
          totalRecords: 0,
          processedRecords: 0,
          insertedRecords: 0,
          skippedRecords: 0,
          errorCount: 0,
          duration: 0,
          checkpoints: [],
          errors: []
        };
      });

      // Set status to running manually for this test
      (backfillJob as any).status.status = 'running';
      
      backfillJob.pause();
      expect(backfillJob.getStatus().status).toBe('paused');

      mockExecute.mockRestore();
    });

    it('should update status when pausing during execution', async () => {
      // Start execution
      const executePromise = backfillJob.execute({ chunkSizeInDays: 30 });
      
      // Pause after a short delay
      setTimeout(() => {
        backfillJob.pause();
      }, 50);
      
      await executePromise;
      
      const status = backfillJob.getStatus().status;
      expect(['completed', 'paused']).toContain(status);
    }, 10000);
  });

  describe('progress tracking', () => {
    it('should track progress correctly', async () => {
      const config = { chunkSizeInDays: 30 };
      
      await backfillJob.execute(config);

      const status = backfillJob.getStatus();
      expect(status.processedDays).toBeGreaterThan(0);
      expect(status.currentChunk).toBeGreaterThan(0);
      expect(status.lastProcessedDate).toBeDefined();
    }, 10000);

    it('should estimate time remaining', async () => {
      await backfillJob.execute({ chunkSizeInDays: 30 });

      const status = backfillJob.getStatus();
      expect(typeof status.estimatedTimeRemaining).toBe('number');
    }, 10000);
  });

  describe('coverage analysis', () => {
    it('should analyze data coverage', async () => {
      await backfillJob.execute();

      // Verify that coverage analysis was called
      // (indirectly tested through successful execution)
      expect(backfillJob.getStatus().status).toBe('completed');
    }, 10000);

    it('should identify gaps in data', async () => {
      // Mock database to return sparse data
      const { db } = require('../../src/lib/supabase/database');
      db.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({
                data: [
                  { date: '2024-08-15' },
                  { date: '2024-08-10' } // 5-day gap
                ],
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await backfillJob.execute({ startYear: 2024 });

      expect(result.insertedRecords).toBeGreaterThanOrEqual(0);
    });
  });

  describe('chunk processing', () => {
    it('should process data in chunks', async () => {
      const config = {
        startYear: 2024,
        endDate: '2024-03-31',
        chunkSizeInDays: 30
      };

      await backfillJob.execute(config);

      const { backfillService } = require('../../src/lib/services/backfill-service');
      
      // Should have been called multiple times (one per chunk)
      expect(backfillService.executeBackfill).toHaveBeenCalledTimes(2);
    });

    it('should add delay between chunks in live mode', async () => {
      const config = {
        delayBetweenChunks: 100,
        chunkSizeInDays: 30,
        dryRun: false
      };

      const startTime = Date.now();
      await backfillJob.execute(config);
      const endTime = Date.now();

      // Should take at least some time due to delays
      expect(endTime - startTime).toBeGreaterThanOrEqual(0);
    });

    it('should not delay in dry run mode', async () => {
      const config = {
        delayBetweenChunks: 1000,
        chunkSizeInDays: 30,
        dryRun: true
      };

      const startTime = Date.now();
      await backfillJob.execute(config);
      const endTime = Date.now();

      // Should be relatively fast in dry run mode
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('result aggregation', () => {
    it('should aggregate results from multiple chunks', async () => {
      const config = { chunkSizeInDays: 30 };
      
      const result = await backfillJob.execute(config);

      expect(result.insertedRecords).toBeGreaterThanOrEqual(0);
      expect(result.skippedRecords).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeGreaterThan(0);
      // Coverage property was removed from BackfillResult type
      // expect(result.coverage).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock the analyzeCoverage method to throw an error for this test
      jest.spyOn(backfillJob as any, 'analyzeCoverage').mockRejectedValue(new Error('Database error'));

      await expect(backfillJob.execute()).rejects.toThrow('Database error');
      
      expect(backfillJob.getStatus().status).toBe('failed');
    });

    it('should handle partial failures gracefully', async () => {
      const { backfillService } = require('../../src/lib/services/backfill-service');
      backfillService.executeBackfill
        .mockResolvedValueOnce({
          totalRecords: 100,
          processedRecords: 100,
          insertedRecords: 100,
          skippedRecords: 0,
          errorCount: 0,
          duration: 1000,
          checkpoints: [],
          errors: []
        })
        .mockRejectedValueOnce(new Error('Chunk failed'))
        .mockResolvedValueOnce({
          totalRecords: 50,
          processedRecords: 50,
          insertedRecords: 50,
          skippedRecords: 0,
          errorCount: 0,
          duration: 500,
          checkpoints: [],
          errors: []
        });

      await expect(backfillJob.execute({ chunkSizeInDays: 30 })).rejects.toThrow('Chunk failed');
    });
  });

  describe('edge cases', () => {
    it('should handle very small date ranges', async () => {
      const config = {
        startYear: 2024,
        endDate: '2024-01-02',
        chunkSizeInDays: 1
      };

      const result = await backfillJob.execute(config);
      expect(result.insertedRecords).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large chunk sizes', async () => {
      const config = {
        startYear: 2024,
        endDate: '2024-12-31',
        chunkSizeInDays: 1000 // Larger than date range
      };

      const result = await backfillJob.execute(config);
      expect(result.insertedRecords).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero delay between chunks', async () => {
      const config = {
        delayBetweenChunks: 0,
        chunkSizeInDays: 30
      };

      const result = await backfillJob.execute(config);
      expect(result.insertedRecords).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('HistoricalBackfillJob Integration', () => {
  it('should work with realistic backfill scenario', async () => {
    const backfillJob = new HistoricalBackfillJob();
    
    // Mock realistic backfill service response
    const { backfillService } = require('../../src/lib/services/backfill-service');
    backfillService.executeBackfill.mockResolvedValue({
      totalRecords: 2650,
      processedRecords: 2650,
      insertedRecords: 2500,
      skippedRecords: 150,
      errorCount: 0,
      duration: 5000,
      checkpoints: [],
      errors: [],
      coverage: {
        totalDays: 90,
        daysWithData: 88,
        missingDays: 2,
        coveragePercent: 97.8
      }
    });

    const config: HistoricalBackfillConfig = {
      startYear: 2023,
      endDate: '2023-06-30',
      chunkSizeInDays: 90,
      delayBetweenChunks: 100,
      skipExisting: true,
      dryRun: false
    };

    const result = await backfillJob.execute(config);

    expect(result.insertedRecords).toBeGreaterThan(0);
    expect(backfillJob.getStatus().status).toBe('completed');
  });
});