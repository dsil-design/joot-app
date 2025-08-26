/**
 * @jest-environment jsdom
 */

import { 
  SyncNotificationService, 
  NotificationConfig, 
  SyncNotification 
} from '../../src/lib/services/sync-notification-service';

// Mock Supabase database
jest.mock('../../src/lib/supabase/database', () => ({
  db: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({
              data: [
                { status: 'failed', started_at: '2024-08-15T10:00:00Z' },
                { status: 'completed', started_at: '2024-08-14T10:00:00Z' }
              ],
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

// Mock Supabase server client
jest.mock('../../src/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({
              data: [
                { status: 'completed', started_at: '2024-08-16T10:00:00Z' },
                { status: 'failed', started_at: '2024-08-15T10:00:00Z' }
              ],
              error: null
            }))
          }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({
        data: { id: 'notification-123' },
        error: null
      }))
    }))
  }))
}));

// Mock fetch for webhook/email notifications
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('SyncNotificationService', () => {
  let notificationService: SyncNotificationService;
  let mockConfig: NotificationConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      emailEnabled: true,
      slackEnabled: true,
      webhookEnabled: true,
      emailRecipients: ['admin@example.com', 'dev@example.com'],
      slackWebhookUrl: 'https://hooks.slack.com/services/TEST/WEBHOOK',
      webhookUrl: 'https://api.example.com/webhook',
      notifyOnFailure: true,
      notifyOnSuccess: false,
      notifyOnFirstSuccess: true
    };
    
    notificationService = new SyncNotificationService(mockConfig);
    
    // Default successful fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ success: true })
    } as Response);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      const service = new SyncNotificationService(mockConfig);
      expect(service).toBeInstanceOf(SyncNotificationService);
    });
  });

  describe('notifyFailure', () => {
    it('should send failure notification when enabled', async () => {
      const syncId = 'test-sync-123';
      const error = 'Network timeout error';
      const details = { phase: 'download', duration: 5000 };

      await notificationService.notifyFailure(syncId, error, details);

      // Should call fetch for webhook notification
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should not send notification when disabled', async () => {
      const disabledConfig = { ...mockConfig, notifyOnFailure: false };
      const service = new SyncNotificationService(disabledConfig);

      await service.notifyFailure('sync-123', 'error');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle notification sending errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Webhook failed'));

      // Should not throw error
      await expect(
        notificationService.notifyFailure('sync-123', 'test error')
      ).resolves.not.toThrow();
    });

    it('should format failure message correctly', async () => {
      const syncId = 'test-sync-456';
      const error = 'XML parsing failed';

      await notificationService.notifyFailure(syncId, error);

      // Verify the call includes proper formatting
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('Exchange Rate Sync Failed')
        })
      );
    });
  });

  describe('notifySuccess', () => {
    it('should send success notification after failure when configured', async () => {
      const syncId = 'test-sync-789';
      const statistics = {
        newRatesInserted: 150,
        ratesUpdated: 25,
        ratesUnchanged: 500
      };

      await notificationService.notifySuccess(syncId, statistics, true);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Sync Restored')
        })
      );
    });

    it('should not send regular success notification when disabled', async () => {
      const statistics = { newRatesInserted: 10, ratesUpdated: 5 };

      await notificationService.notifySuccess('sync-123', statistics, false);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should send regular success notification when enabled', async () => {
      const enabledConfig = { ...mockConfig, notifyOnSuccess: true };
      const service = new SyncNotificationService(enabledConfig);
      const statistics = { newRatesInserted: 10, ratesUpdated: 5 };

      await service.notifySuccess('sync-123', statistics, false);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Sync Completed')
        })
      );
    });

    it('should include statistics in success notification', async () => {
      const statistics = {
        newRatesInserted: 75,
        ratesUpdated: 12,
        ratesUnchanged: 300
      };

      await notificationService.notifySuccess('sync-123', statistics, true);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"details":')
        })
      );
    });
  });

  describe('notifyWarning', () => {
    it('should send warning notification', async () => {
      const syncId = 'test-sync-warning';
      const warning = 'No new exchange rate data available';
      const details = { lastUpdateDate: '2024-08-15' };

      await notificationService.notifyWarning(syncId, warning, details);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Sync Warning')
        })
      );
    });

    it('should handle warning without details', async () => {
      await notificationService.notifyWarning('sync-123', 'Simple warning');

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('shouldNotifySuccessAfterFailure', () => {
    it('should return true when previous sync was failed', async () => {
      const shouldNotify = await notificationService.shouldNotifySuccessAfterFailure('sync-123');

      expect(shouldNotify).toBe(true);
    });

    it('should return false when no previous failed syncs', async () => {
      // Mock createClient to return successful syncs only
      const { createClient } = require('../../src/lib/supabase/server');
      createClient.mockReturnValueOnce({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({
                data: [
                  { status: 'completed', started_at: '2024-08-16T10:00:00Z' },
                  { status: 'completed', started_at: '2024-08-15T10:00:00Z' }
                ],
                error: null
              }))
            }))
          }))
        }))
      });

      const shouldNotify = await notificationService.shouldNotifySuccessAfterFailure('sync-123');

      expect(shouldNotify).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Mock createClient error
      const { createClient } = require('../../src/lib/supabase/server');
      createClient.mockReturnValueOnce({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({
                data: null,
                error: new Error('Database error')
              }))
            }))
          }))
        }))
      });

      const shouldNotify = await notificationService.shouldNotifySuccessAfterFailure('sync-123');

      expect(shouldNotify).toBe(false);
    });
  });

  describe('notification channels', () => {
    it('should send to multiple channels when all enabled', async () => {
      await notificationService.notifyFailure('sync-123', 'test error');

      // Should make multiple fetch calls for different channels
      // (webhook, slack, email service)
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should only send to enabled channels', async () => {
      const partialConfig = {
        ...mockConfig,
        slackEnabled: false,
        emailEnabled: false,
        webhookEnabled: true
      };
      const service = new SyncNotificationService(partialConfig);

      await service.notifyFailure('sync-123', 'test error');

      // Should only make one call (webhook)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle partial channel failures', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response) // webhook succeeds
        .mockRejectedValueOnce(new Error('Slack failed')); // slack fails

      // Should not throw error even if one channel fails
      await expect(
        notificationService.notifyFailure('sync-123', 'test error')
      ).resolves.not.toThrow();
    });
  });

  describe('notification formatting', () => {
    it('should create proper notification structure', async () => {
      const syncId = 'format-test-123';
      const error = 'Format test error';

      await notificationService.notifyFailure(syncId, error);

      const expectedCall = expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining(JSON.stringify({
          type: 'failure',
          title: '❌ Exchange Rate Sync Failed',
          syncId: syncId,
          timestamp: expect.any(String)
        }).substring(1, -1)) // Remove outer braces for partial match
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expectedCall
      );
    });

    it('should include timestamp in ISO format', async () => {
      await notificationService.notifyFailure('sync-123', 'test');

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      if (callArgs && callArgs[1] && callArgs[1].body) {
        const notification = JSON.parse(callArgs[1].body);
        expect(notification.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty email recipients', async () => {
      const noEmailConfig = { ...mockConfig, emailRecipients: [] };
      const service = new SyncNotificationService(noEmailConfig);

      await expect(
        service.notifyFailure('sync-123', 'test error')
      ).resolves.not.toThrow();
    });

    it('should handle missing webhook URLs', async () => {
      const noWebhookConfig = { 
        ...mockConfig, 
        slackWebhookUrl: undefined, 
        webhookUrl: undefined 
      };
      const service = new SyncNotificationService(noWebhookConfig);

      await expect(
        service.notifyFailure('sync-123', 'test error')
      ).resolves.not.toThrow();
    });

    it('should handle very long error messages', async () => {
      const longError = 'A'.repeat(10000);

      await expect(
        notificationService.notifyFailure('sync-123', longError)
      ).resolves.not.toThrow();
    });

    it('should handle special characters in messages', async () => {
      const specialError = 'Error with 特殊文字 and émojis 🚀';

      await expect(
        notificationService.notifyFailure('sync-123', specialError)
      ).resolves.not.toThrow();
    });
  });
});

describe('SyncNotificationService Integration', () => {
  it('should work with realistic notification flow', async () => {
    const config: NotificationConfig = {
      emailEnabled: true,
      slackEnabled: true,
      webhookEnabled: false,
      emailRecipients: ['admin@joot.com'],
      slackWebhookUrl: 'https://hooks.slack.com/test',
      webhookUrl: undefined,
      notifyOnFailure: true,
      notifyOnSuccess: false,
      notifyOnFirstSuccess: true
    };

    const service = new SyncNotificationService(config);

    // Test failure notification
    await service.notifyFailure('real-sync-123', 'Connection timeout', {
      phase: 'download',
      duration: 30000,
      retries: 3
    });

    expect(mockFetch).toHaveBeenCalled();

    // Test success after failure
    const wasAfterFailure = await service.shouldNotifySuccessAfterFailure('real-sync-124');
    await service.notifySuccess('real-sync-124', {
      newRatesInserted: 45,
      ratesUpdated: 12,
      ratesUnchanged: 432
    }, wasAfterFailure);

    expect(mockFetch).toHaveBeenCalledTimes(2); // failure + success calls
  });
});