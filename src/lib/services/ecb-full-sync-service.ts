/**
 * ECB Full XML Sync Service
 * Downloads the complete ECB historical XML file daily and intelligently syncs changes
 */

import { ECBRate, ECBError, ECBErrorType } from '../types/exchange-rates';
import { createClient } from '../supabase/server';
import { currencyConfigService } from './currency-config-service';
import { rateCalculator } from './rate-calculator';
import { CurrencyType } from '../supabase/types';
import { db } from '../supabase/database';
import { syncNotificationService } from './sync-notification-service';

// Sync-specific types
export interface SyncConfiguration {
  startDate: string;
  autoSyncEnabled: boolean;
  syncTime: string;
  maxRetries: number;
  retryDelaySeconds: number;
  trackedCurrencies: string[];
}

export interface SyncResult {
  success: boolean;
  syncId: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  statistics: {
    totalRatesInXml: number;
    filteredRates: number;
    newRatesInserted: number;
    ratesUpdated: number;
    ratesDeleted: number;
    ratesUnchanged: number;
  };
  errors?: Array<{
    phase: string;
    message: string;
    details?: any;
  }>;
}

export interface RateDiff {
  type: 'insert' | 'update' | 'delete' | 'unchanged';
  fromCurrency: string;
  toCurrency: string;
  date: string;
  oldRate?: number;
  newRate?: number;
  rateId?: string;
}

export enum SyncPhase {
  DOWNLOAD = 'download',
  PARSE = 'parse',
  FILTER = 'filter',
  DIFF = 'diff',
  UPDATE = 'update',
  CLEANUP = 'cleanup'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

export class ECBFullSyncService {
  private syncHistoryId?: string;
  private configuration?: SyncConfiguration;
  private abortController?: AbortController;

  /**
   * Execute a full sync of ECB exchange rates
   */
  async executeSync(
    syncType: 'manual' | 'scheduled' | 'auto_retry' = 'manual',
    triggeredBy?: string
  ): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // Load configuration
      this.configuration = await this.loadConfiguration();
      
      // Initialize sync history record
      this.syncHistoryId = await this.initializeSyncHistory(syncType, triggeredBy);
      
      await this.log(LogLevel.INFO, SyncPhase.DOWNLOAD, 'Starting ECB full sync', {
        syncType,
        configuration: this.configuration
      });

      // Phase 1: Download XML
      const xmlData = await this.downloadECBXml();
      
      // Phase 2: Parse XML
      const allRates = await this.parseXML(xmlData);
      
      // Phase 3: Filter by configuration
      const filteredRates = await this.filterRates(allRates);
      
      // Phase 4: Calculate diff against existing data
      const diffs = await this.calculateDiffs(filteredRates);
      
      // Phase 5: Apply updates to database
      const updateResults = await this.applyUpdates(diffs);
      
      // Phase 6: Cleanup old data if needed
      await this.cleanupOldData();
      
      // Complete sync
      const duration = Date.now() - startTime;
      await this.completeSyncHistory(true, duration, updateResults);
      
      await this.log(LogLevel.INFO, SyncPhase.UPDATE, 'Sync completed successfully', {
        duration,
        statistics: updateResults
      });

      // Send success notification if needed
      const wasAfterFailure = await syncNotificationService.shouldNotifySuccessAfterFailure(this.syncHistoryId);
      await syncNotificationService.notifySuccess(this.syncHistoryId, updateResults, wasAfterFailure);

      return {
        success: true,
        syncId: this.syncHistoryId,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration,
        statistics: updateResults
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await this.log(LogLevel.ERROR, SyncPhase.UPDATE, 'Sync failed', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (this.syncHistoryId) {
        await this.completeSyncHistory(false, duration, undefined, errorMessage);
        
        // Send failure notification
        await syncNotificationService.notifyFailure(
          this.syncHistoryId, 
          errorMessage,
          {
            syncType,
            duration,
            phase: 'unknown',
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack
            } : error
          }
        );
      }
      
      throw error;
    }
  }

  /**
   * Download the complete ECB XML file
   */
  private async downloadECBXml(): Promise<string> {
    const phase = SyncPhase.DOWNLOAD;
    const startTime = Date.now();
    
    try {
      await this.log(LogLevel.INFO, phase, 'Downloading ECB historical XML');
      
      this.abortController = new AbortController();
      
      const response = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.xml', {
        headers: {
          'Accept': 'application/xml, text/xml',
          'User-Agent': 'ECB-Full-Sync/1.0'
        },
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new ECBError(
          ECBErrorType.NETWORK_ERROR,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const xmlText = await response.text();
      const downloadTime = Date.now() - startTime;
      const fileSize = new Blob([xmlText]).size;

      await this.log(LogLevel.INFO, phase, 'XML downloaded successfully', {
        downloadTimeMs: downloadTime,
        fileSizeBytes: fileSize,
        fileSizeMB: (fileSize / 1024 / 1024).toFixed(2)
      });

      // Update sync history with download metrics
      if (this.syncHistoryId) {
        const supabase = await createClient();
        await supabase.from('sync_history').update({
          xml_file_size_bytes: fileSize,
          xml_download_time_ms: downloadTime
        }).eq('id', this.syncHistoryId);
      }

      return xmlText;

    } catch (error) {
      await this.log(LogLevel.ERROR, phase, 'Failed to download XML', { error });
      throw new ECBError(
        ECBErrorType.NETWORK_ERROR,
        `Download failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse the ECB XML data
   */
  private async parseXML(xmlString: string): Promise<ECBRate[]> {
    const phase = SyncPhase.PARSE;
    const startTime = Date.now();
    
    try {
      await this.log(LogLevel.INFO, phase, 'Parsing ECB XML');
      
      // Use DOMParser for browser or JSDOM for Node.js
      let doc: Document;
      if (typeof DOMParser !== 'undefined') {
        doc = new DOMParser().parseFromString(xmlString, 'text/xml');
      } else {
        // Use dynamic import for JSDOM in Node.js environment
        const { JSDOM } = await import('jsdom');
        doc = new JSDOM(xmlString, { contentType: 'text/xml' }).window.document;
      }

      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new ECBError(ECBErrorType.PARSE_ERROR, 'XML parsing failed');
      }

      const rates: ECBRate[] = [];
      const timeCubes = Array.from(doc.querySelectorAll('Cube[time]'));
      
      for (const timeCube of timeCubes) {
        const date = timeCube.getAttribute('time');
        if (!date) continue;

        const rateCubes = Array.from(timeCube.querySelectorAll('Cube[currency][rate]'));
        
        for (const rateCube of rateCubes) {
          const currency = rateCube.getAttribute('currency');
          const rateStr = rateCube.getAttribute('rate');
          
          if (currency && rateStr) {
            const rate = parseFloat(rateStr);
            if (!isNaN(rate) && rate > 0) {
              rates.push({ date, currency, rate });
            }
          }
        }
      }

      const parseTime = Date.now() - startTime;
      
      await this.log(LogLevel.INFO, phase, 'XML parsed successfully', {
        totalRates: rates.length,
        uniqueDates: new Set(rates.map(r => r.date)).size,
        uniqueCurrencies: new Set(rates.map(r => r.currency)).size,
        parseTimeMs: parseTime
      });

      // Update sync history
      if (this.syncHistoryId) {
        const supabase = await createClient();
        await supabase.from('sync_history').update({
          total_rates_in_xml: rates.length
        }).eq('id', this.syncHistoryId);
      }

      return rates;

    } catch (error) {
      await this.log(LogLevel.ERROR, phase, 'Failed to parse XML', { error });
      throw error instanceof ECBError ? error : new ECBError(
        ECBErrorType.PARSE_ERROR,
        `Parse failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Filter rates based on configuration
   */
  private async filterRates(allRates: ECBRate[]): Promise<ECBRate[]> {
    const phase = SyncPhase.FILTER;
    
    try {
      await this.log(LogLevel.INFO, phase, 'Filtering rates by configuration');
      
      const { startDate, trackedCurrencies } = this.configuration!;
      const endDate = new Date().toISOString().split('T')[0];
      
      // Filter by date range and tracked currencies
      const filteredRates = allRates.filter(rate => {
        const dateInRange = rate.date >= startDate && rate.date <= endDate;
        const currencyTracked = trackedCurrencies.includes(rate.currency);
        return dateInRange && currencyTracked;
      });

      await this.log(LogLevel.INFO, phase, 'Rates filtered successfully', {
        originalCount: allRates.length,
        filteredCount: filteredRates.length,
        startDate,
        endDate,
        trackedCurrencies
      });

      // Update sync history
      if (this.syncHistoryId) {
        const supabase = await createClient();
        await supabase.from('sync_history').update({
          filtered_rates: filteredRates.length,
          currencies_tracked: trackedCurrencies,
          start_date: startDate,
          end_date: endDate
        }).eq('id', this.syncHistoryId);
      }

      return filteredRates;

    } catch (error) {
      await this.log(LogLevel.ERROR, phase, 'Failed to filter rates', { error });
      throw error;
    }
  }

  /**
   * Calculate differences between XML data and database
   */
  private async calculateDiffs(ecbRates: ECBRate[]): Promise<RateDiff[]> {
    const phase = SyncPhase.DIFF;
    const startTime = Date.now();
    
    try {
      await this.log(LogLevel.INFO, phase, 'Calculating differences with database');
      
      const diffs: RateDiff[] = [];
      const { startDate } = this.configuration!;
      const endDate = new Date().toISOString().split('T')[0];
      
      // Group ECB rates by date for efficient processing
      const ratesByDate = new Map<string, ECBRate[]>();
      for (const rate of ecbRates) {
        if (!ratesByDate.has(rate.date)) {
          ratesByDate.set(rate.date, []);
        }
        ratesByDate.get(rate.date)!.push(rate);
      }

      // Process each date
      for (const [date, rates] of ratesByDate) {
        // Generate all currency pairs for this date
        const processedRates = this.generateCurrencyPairs(rates, date);
        
        // Get existing rates from database for this date
        const supabase = await createClient();
        const { data: existingRates } = await supabase.from('exchange_rates')
          .select('id, from_currency, to_currency, rate, date')
          .eq('date', date);
        
        // Create lookup map for existing rates
        const existingMap = new Map<string, any>();
        if (existingRates) {
          for (const existing of existingRates) {
            const key = `${existing.from_currency}-${existing.to_currency}-${existing.date}`;
            existingMap.set(key, existing);
          }
        }

        // Compare and generate diffs
        for (const newRate of processedRates) {
          const key = `${newRate.from_currency}-${newRate.to_currency}-${newRate.date}`;
          const existing = existingMap.get(key);
          
          if (!existing) {
            // New rate
            diffs.push({
              type: 'insert',
              fromCurrency: newRate.from_currency,
              toCurrency: newRate.to_currency,
              date: newRate.date,
              newRate: newRate.rate
            });
          } else if (Math.abs(existing.rate - newRate.rate) > 0.0001) {
            // Rate changed (using small epsilon for float comparison)
            diffs.push({
              type: 'update',
              fromCurrency: newRate.from_currency,
              toCurrency: newRate.to_currency,
              date: newRate.date,
              oldRate: existing.rate,
              newRate: newRate.rate,
              rateId: existing.id
            });
            existingMap.delete(key);
          } else {
            // Rate unchanged
            diffs.push({
              type: 'unchanged',
              fromCurrency: newRate.from_currency,
              toCurrency: newRate.to_currency,
              date: newRate.date,
              newRate: newRate.rate,
              rateId: existing.id
            });
            existingMap.delete(key);
          }
        }

        // Any remaining in existingMap should be deleted (no longer in ECB data)
        for (const [key, existing] of existingMap) {
          // Only delete if within our configured date range
          if (existing.date >= startDate && existing.date <= endDate) {
            diffs.push({
              type: 'delete',
              fromCurrency: existing.from_currency,
              toCurrency: existing.to_currency,
              date: existing.date,
              oldRate: existing.rate,
              rateId: existing.id
            });
          }
        }
      }

      const diffTime = Date.now() - startTime;
      const summary = {
        inserts: diffs.filter(d => d.type === 'insert').length,
        updates: diffs.filter(d => d.type === 'update').length,
        deletes: diffs.filter(d => d.type === 'delete').length,
        unchanged: diffs.filter(d => d.type === 'unchanged').length,
        diffTimeMs: diffTime
      };

      await this.log(LogLevel.INFO, phase, 'Diff calculation completed', summary);

      return diffs;

    } catch (error) {
      await this.log(LogLevel.ERROR, phase, 'Failed to calculate diffs', { error });
      throw error;
    }
  }

  /**
   * Generate all currency pairs from ECB rates
   */
  private generateCurrencyPairs(rates: ECBRate[], date: string): any[] {
    const pairs: any[] = [];
    const { trackedCurrencies } = this.configuration!;
    
    // Add EUR pairs (ECB rates are EUR-based)
    for (const rate of rates) {
      if (trackedCurrencies.includes(rate.currency)) {
        // EUR to currency
        pairs.push({
          from_currency: 'EUR',
          to_currency: rate.currency,
          rate: rate.rate,
          date,
          source: 'ECB'
        });
        
        // Currency to EUR
        pairs.push({
          from_currency: rate.currency,
          to_currency: 'EUR',
          rate: 1 / rate.rate,
          date,
          source: 'ECB'
        });
      }
    }
    
    // Calculate cross rates for all tracked currency pairs
    const crossRates = rateCalculator.calculateCrossRates(rates);
    for (const crossRate of crossRates) {
      if (trackedCurrencies.includes(crossRate.from_currency) && 
          trackedCurrencies.includes(crossRate.to_currency)) {
        pairs.push({
          from_currency: crossRate.from_currency,
          to_currency: crossRate.to_currency,
          rate: crossRate.rate,
          date,
          source: 'ECB'
        });
      }
    }
    
    return pairs;
  }

  /**
   * Deduplicate inserts to prevent "cannot affect row a second time" error
   * Keeps the first occurrence of each unique (from_currency, to_currency, date) combination
   */
  private deduplicateInserts(inserts: RateDiff[]): RateDiff[] {
    const seen = new Map<string, RateDiff>();

    for (const insert of inserts) {
      const key = `${insert.fromCurrency}-${insert.toCurrency}-${insert.date}`;
      if (!seen.has(key)) {
        seen.set(key, insert);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Apply updates to the database
   */
  private async applyUpdates(diffs: RateDiff[]): Promise<any> {
    const phase = SyncPhase.UPDATE;
    const startTime = Date.now();
    
    try {
      await this.log(LogLevel.INFO, phase, 'Applying updates to database');
      
      const inserts = diffs.filter(d => d.type === 'insert');
      const updates = diffs.filter(d => d.type === 'update');
      const deletes = diffs.filter(d => d.type === 'delete');

      let insertedCount = 0;
      let updatedCount = 0;
      let deletedCount = 0;

      // Deduplicate inserts to avoid "cannot affect row a second time" error
      const deduplicatedInserts = this.deduplicateInserts(inserts);
      await this.log(LogLevel.INFO, phase, `Deduplicated ${inserts.length} inserts to ${deduplicatedInserts.length} unique rates`);

      // Process inserts in batches
      if (deduplicatedInserts.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < deduplicatedInserts.length; i += batchSize) {
          const batch = deduplicatedInserts.slice(i, i + batchSize);
          const insertData = batch.map(diff => ({
            from_currency: diff.fromCurrency as CurrencyType,
            to_currency: diff.toCurrency as CurrencyType,
            rate: diff.newRate!,
            date: diff.date,
            source: 'ECB',
            is_interpolated: false
          }));
          
          const supabase = await createClient();
          const { error } = await supabase.from('exchange_rates')
            .upsert(insertData, {
              onConflict: 'from_currency,to_currency,date',
              ignoreDuplicates: false
            });
          if (error) throw error;
          
          insertedCount += batch.length;
          
          // Log rate changes for audit
          if (this.syncHistoryId) {
            const changeRecords = batch.map(diff => ({
              sync_history_id: this.syncHistoryId,
              change_type: 'insert',
              from_currency: diff.fromCurrency,
              to_currency: diff.toCurrency,
              rate_date: diff.date,
              new_rate: diff.newRate
            }));
            await supabase.from('rate_changes').insert(changeRecords);
          }
        }
      }
      
      // Process updates individually (usually fewer)
      for (const update of updates) {
        const supabase = await createClient();
        const { error } = await supabase.from('exchange_rates')
          .update({ rate: update.newRate })
          .eq('id', update.rateId!);
        
        if (!error) {
          updatedCount++;
          
          // Log rate change for audit
          if (this.syncHistoryId) {
            await supabase.from('rate_changes').insert({
              sync_history_id: this.syncHistoryId,
              exchange_rate_id: update.rateId,
              change_type: 'update',
              from_currency: update.fromCurrency,
              to_currency: update.toCurrency,
              rate_date: update.date,
              old_rate: update.oldRate,
              new_rate: update.newRate
            });
          }
        }
      }
      
      // Process deletes
      if (deletes.length > 0) {
        const idsToDelete = deletes.map(d => d.rateId!).filter(Boolean);
        if (idsToDelete.length > 0) {
          // Log deletions before removing
          const supabase = await createClient();
          if (this.syncHistoryId) {
            const deleteRecords = deletes.map(diff => ({
              sync_history_id: this.syncHistoryId,
              exchange_rate_id: diff.rateId,
              change_type: 'delete',
              from_currency: diff.fromCurrency,
              to_currency: diff.toCurrency,
              rate_date: diff.date,
              old_rate: diff.oldRate
            }));
            await supabase.from('rate_changes').insert(deleteRecords);
          }
          
          const { error } = await supabase.from('exchange_rates')
            .delete()
            .in('id', idsToDelete);
          
          if (!error) {
            deletedCount = idsToDelete.length;
          }
        }
      }
      
      const updateTime = Date.now() - startTime;
      const statistics = {
        totalRatesInXml: 0, // Will be updated from sync_history
        filteredRates: diffs.length,
        newRatesInserted: insertedCount,
        ratesUpdated: updatedCount,
        ratesDeleted: deletedCount,
        ratesUnchanged: diffs.filter(d => d.type === 'unchanged').length,
        updateTimeMs: updateTime
      };
      
      await this.log(LogLevel.INFO, phase, 'Database updates completed', statistics);
      
      return statistics;

    } catch (error) {
      await this.log(LogLevel.ERROR, phase, 'Failed to apply updates', { error });
      throw error;
    }
  }

  /**
   * Clean up old data outside the configured date range
   */
  private async cleanupOldData(): Promise<void> {
    const phase = SyncPhase.CLEANUP;
    
    try {
      await this.log(LogLevel.INFO, phase, 'Checking for old data to clean up');
      
      const { startDate } = this.configuration!;
      
      // Delete rates older than configured start date
      const supabase = await createClient();
      const { data, error } = await supabase.from('exchange_rates')
        .delete()
        .lt('date', startDate)
        .select('id');
      
      if (error) throw error;
      
      const deletedCount = data?.length || 0;
      
      if (deletedCount > 0) {
        await this.log(LogLevel.INFO, phase, `Cleaned up ${deletedCount} old rates`, {
          beforeDate: startDate
        });
      } else {
        await this.log(LogLevel.DEBUG, phase, 'No old data to clean up');
      }

    } catch (error) {
      await this.log(LogLevel.WARNING, phase, 'Cleanup failed (non-critical)', { error });
      // Don't throw - cleanup is non-critical
    }
  }

  /**
   * Load sync configuration from database
   */
  private async loadConfiguration(): Promise<SyncConfiguration> {
    const supabase = await createClient();
    const { data, error } = await supabase.from('sync_configuration')
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Get tracked currencies
    const { data: currencies } = await supabase.from('currency_configuration')
      .select('currency_code')
      .eq('is_tracked', true)
      .eq('source', 'ECB');
    
    return {
      startDate: data.start_date,
      autoSyncEnabled: data.auto_sync_enabled ?? true,
      syncTime: data.sync_time ?? '17:00:00',
      maxRetries: data.max_retries ?? 3,
      retryDelaySeconds: data.retry_delay_seconds ?? 300,
      trackedCurrencies: currencies?.map((c: any) => c.currency_code) || []
    };
  }

  /**
   * Initialize sync history record
   */
  private async initializeSyncHistory(
    syncType: string,
    triggeredBy?: string
  ): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.from('sync_history')
      .insert({
        sync_type: syncType,
        status: 'running',
        triggered_by: triggeredBy
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  }

  /**
   * Complete sync history record
   */
  private async completeSyncHistory(
    success: boolean,
    duration: number,
    statistics?: any,
    errorMessage?: string
  ): Promise<void> {
    if (!this.syncHistoryId) return;
    
    const supabase = await createClient();
    await supabase.from('sync_history').update({
      status: success ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      new_rates_inserted: statistics?.newRatesInserted || 0,
      rates_updated: statistics?.ratesUpdated || 0,
      rates_deleted: statistics?.ratesDeleted || 0,
      rates_unchanged: statistics?.ratesUnchanged || 0,
      error_message: errorMessage
    }).eq('id', this.syncHistoryId);
  }

  /**
   * Log sync operation
   */
  private async log(
    level: LogLevel,
    phase: SyncPhase,
    message: string,
    details?: any
  ): Promise<void> {
    // Console logging
    const logMethod = level === LogLevel.ERROR ? console.error : 
                     level === LogLevel.WARNING ? console.warn : 
                     console.log;
    
    logMethod(`[${phase.toUpperCase()}] ${message}`, details || '');
    
    // Database logging
    if (this.syncHistoryId) {
      const supabase = await createClient();
      await supabase.from('sync_logs').insert({
        sync_history_id: this.syncHistoryId,
        log_level: level,
        phase,
        message,
        details
      });
    }
  }

  /**
   * Cancel ongoing sync
   */
  cancelSync(): void {
    this.abortController?.abort();
  }
}

// Export singleton instance
export const ecbFullSyncService = new ECBFullSyncService();