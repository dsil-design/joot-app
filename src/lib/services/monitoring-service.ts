import { createClient } from '@/lib/supabase/client';

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  lastSyncDate: string | null;
  ratesAvailable: number;
  gapsDetected: number;
  errorRate: number;
  uptimePercent: number;
  lastError?: string;
  timestamp: string;
}

export interface DataQualityMetrics {
  totalRecords: number;
  recordsBySource: Record<string, number>;
  interpolatedRates: number;
  missingDates: string[];
  latestRates: any[];
  qualityScore: number;
  currencyPairCoverage: Record<string, number>;
  lastUpdated: string;
}

export interface SyncHistoryEntry {
  id: string;
  timestamp: string;
  type: 'fiat' | 'crypto' | 'both' | 'backfill';
  status: 'success' | 'failure' | 'partial';
  ratesProcessed: number;
  duration: number;
  errorMessage?: string;
  details?: any;
}

export class MonitoringService {
  
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const [
        lastSync,
        totalRates,
        gaps,
        recentErrors
      ] = await Promise.all([
        this.getLastSyncDate(),
        this.getTotalRatesCount(),
        this.getGapsCount(),
        this.getRecentErrors()
      ]);

      // Calculate error rate (errors in last 24 hours)
      const errorRate = recentErrors.length;
      
      // Calculate uptime based on successful syncs
      const uptimePercent = await this.calculateUptime();
      
      // Determine overall status
      let status: 'healthy' | 'warning' | 'critical';
      if (gaps > 10 || errorRate > 5) {
        status = 'critical';
      } else if (gaps > 5 || errorRate > 2) {
        status = 'warning';
      } else {
        status = 'healthy';
      }

      return {
        status,
        lastSyncDate: lastSync,
        ratesAvailable: totalRates,
        gapsDetected: gaps,
        errorRate,
        uptimePercent,
        lastError: recentErrors[0]?.error_message,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        status: 'critical',
        lastSyncDate: null,
        ratesAvailable: 0,
        gapsDetected: 0,
        errorRate: 100,
        uptimePercent: 0,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getDataQualityMetrics(): Promise<DataQualityMetrics> {
    try {
      const [
        totalRecords,
        sourceBreakdown,
        interpolatedCount,
        missingDates,
        latestRates
      ] = await Promise.all([
        this.getTotalRatesCount(),
        this.getRecordsBySource(),
        this.getInterpolatedRatesCount(),
        this.getMissingDates(),
        this.getLatestRates()
      ]);

      // Calculate quality score
      const qualityScore = this.calculateQualityScore({
        totalRecords,
        interpolatedCount,
        missingDates: missingDates.length
      });

      // Calculate currency pair coverage
      const currencyPairCoverage = await this.getCurrencyPairCoverage();

      return {
        totalRecords,
        recordsBySource: sourceBreakdown,
        interpolatedRates: interpolatedCount,
        missingDates,
        latestRates,
        qualityScore,
        currencyPairCoverage,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting data quality metrics:', error);
      throw error;
    }
  }

  async getSyncHistory(limit: number = 20): Promise<SyncHistoryEntry[]> {
    try {
      const supabase = createClient();
      // This would ideally come from a sync_history table
      // For now, we'll simulate it based on available data
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('created_at, source')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Group by date and source to simulate sync entries
      const syncs = new Map<string, SyncHistoryEntry>();
      
      data?.forEach((record, index) => {
        const date = record.created_at?.split('T')[0] || 'unknown';
        const key = `${date}-${record.source}`;
        
        if (!syncs.has(key)) {
          syncs.set(key, {
            id: `sync-${index}`,
            timestamp: record.created_at || new Date().toISOString(),
            type: record.source === 'COINGECKO' ? 'crypto' : 'fiat',
            status: 'success', // We only have successful records in the DB
            ratesProcessed: 1,
            duration: Math.floor(Math.random() * 10000) + 2000, // Simulated
          });
        } else {
          const existing = syncs.get(key)!;
          existing.ratesProcessed += 1;
        }
      });

      return Array.from(syncs.values()).slice(0, limit);
    } catch (error) {
      console.error('Error getting sync history:', error);
      return [];
    }
  }

  private async getLastSyncDate(): Promise<string | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('date')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;
      return data.date;
    } catch (error) {
      return null;
    }
  }

  private async getTotalRatesCount(): Promise<number> {
    try {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('exchange_rates')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting total rates count:', error);
      return 0;
    }
  }

  private async getGapsCount(): Promise<number> {
    try {
      const supabase = createClient();
      // This is a simplified gap detection
      // In a real implementation, you'd have more sophisticated gap analysis
      const { count, error } = await supabase
        .from('exchange_rates')
        .select('*', { count: 'exact', head: true })
        .eq('is_interpolated', true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting gaps count:', error);
      return 0;
    }
  }

  private async getRecentErrors(): Promise<any[]> {
    try {
      // This would come from an error_log table in a real implementation
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error getting recent errors:', error);
      return [];
    }
  }

  private async calculateUptime(): Promise<number> {
    try {
      const supabase = createClient();
      // Calculate uptime based on successful syncs in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: totalDays } = await supabase
        .from('exchange_rates')
        .select('date', { count: 'exact' })
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Assuming we should have data for ~22 business days in 30 days
      const expectedDays = 22;
      const actualDays = Math.min(totalDays || 0, expectedDays);
      
      return Math.round((actualDays / expectedDays) * 100);
    } catch (error) {
      console.error('Error calculating uptime:', error);
      return 0;
    }
  }

  private async getRecordsBySource(): Promise<Record<string, number>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('source')
        .not('source', 'is', null);

      if (error) throw error;

      const breakdown: Record<string, number> = {};
      data?.forEach(record => {
        breakdown[record.source] = (breakdown[record.source] || 0) + 1;
      });

      return breakdown;
    } catch (error) {
      console.error('Error getting records by source:', error);
      return {};
    }
  }

  private async getInterpolatedRatesCount(): Promise<number> {
    try {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('exchange_rates')
        .select('*', { count: 'exact', head: true })
        .eq('is_interpolated', true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting interpolated rates count:', error);
      return 0;
    }
  }

  private async getMissingDates(): Promise<string[]> {
    try {
      const supabase = createClient();
      // This is simplified - in reality you'd check for missing business days
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('exchange_rates')
        .select('date')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0]);

      if (error) throw error;

      // Get unique dates
      const presentDates = new Set(data?.map(r => r.date) || []);
      
      // Generate expected business days and find missing ones
      const expectedDates: string[] = [];
      const current = new Date(thirtyDaysAgo);
      
      while (current <= today) {
        // Skip weekends (simplified - doesn't account for holidays)
        if (current.getDay() !== 0 && current.getDay() !== 6) {
          expectedDates.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
      }

      return expectedDates.filter(date => !presentDates.has(date)).slice(0, 10); // Limit to 10
    } catch (error) {
      console.error('Error getting missing dates:', error);
      return [];
    }
  }

  private async getLatestRates(): Promise<any[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting latest rates:', error);
      return [];
    }
  }

  private async getCurrencyPairCoverage(): Promise<Record<string, number>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('from_currency, to_currency')
        .not('from_currency', 'is', null)
        .not('to_currency', 'is', null);

      if (error) throw error;

      const coverage: Record<string, number> = {};
      data?.forEach(record => {
        const pair = `${record.from_currency}/${record.to_currency}`;
        coverage[pair] = (coverage[pair] || 0) + 1;
      });

      return coverage;
    } catch (error) {
      console.error('Error getting currency pair coverage:', error);
      return {};
    }
  }

  private calculateQualityScore(metrics: {
    totalRecords: number;
    interpolatedCount: number;
    missingDates: number;
  }): number {
    if (metrics.totalRecords === 0) return 0;

    // Base score
    let score = 100;

    // Penalize interpolated rates (reduce quality if too many interpolated)
    const interpolatedRatio = metrics.interpolatedCount / metrics.totalRecords;
    score -= interpolatedRatio * 30; // Max 30 points penalty

    // Penalize missing dates
    score -= Math.min(metrics.missingDates * 5, 30); // Max 30 points penalty

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

// Singleton instance
export const monitoringService = new MonitoringService();