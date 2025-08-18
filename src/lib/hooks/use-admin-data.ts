import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SystemHealth, DataQualityMetrics, SyncHistoryEntry } from '@/lib/services/monitoring-service';
import { ExchangeRate } from '@/lib/supabase/types';

// Hook for system health data
export function useSystemHealth() {
  return useQuery<SystemHealth>({
    queryKey: ['admin', 'system-health'],
    queryFn: async () => {
      const response = await fetch('/api/admin/system-health');
      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });
}

// Hook for data quality metrics
export function useDataQuality() {
  return useQuery<DataQualityMetrics>({
    queryKey: ['admin', 'data-quality'],
    queryFn: async () => {
      const response = await fetch('/api/admin/data-quality');
      if (!response.ok) {
        throw new Error('Failed to fetch data quality metrics');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 45000, // Consider data stale after 45 seconds
  });
}

// Hook for sync history
export function useSyncHistory(limit: number = 20) {
  return useQuery<SyncHistoryEntry[]>({
    queryKey: ['admin', 'sync-history', limit],
    queryFn: async () => {
      const response = await fetch(`/api/admin/sync-history?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sync history');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Hook for exchange rate lookup
export function useExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date: string
) {
  return useQuery<ExchangeRate>({
    queryKey: ['exchange-rate', fromCurrency, toCurrency, date],
    queryFn: async () => {
      const response = await fetch(
        `/api/exchange-rates?from=${fromCurrency}&to=${toCurrency}&date=${date}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rate');
      }
      return response.json();
    },
    enabled: !!(fromCurrency && toCurrency && date), // Only fetch if all params provided
    staleTime: 300000, // Consider data stale after 5 minutes (historical rates don't change)
  });
}

// Hook for historical rates (for charts/trends)
export function useHistoricalRates(
  fromCurrency: string,
  toCurrency: string,
  days: number = 30
) {
  return useQuery<ExchangeRate[]>({
    queryKey: ['historical-rates', fromCurrency, toCurrency, days],
    queryFn: async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const response = await fetch(
        `/api/exchange-rates/historical?from=${fromCurrency}&to=${toCurrency}&start=${startDateStr}&end=${endDate}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch historical rates');
      }
      return response.json();
    },
    enabled: !!(fromCurrency && toCurrency), // Only fetch if currencies provided
    staleTime: 300000, // Consider data stale after 5 minutes
  });
}

// Hook for triggering manual sync
export function useTriggerSync() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (options: {
      type: 'fiat' | 'crypto' | 'both' | 'backfill';
      date?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const response = await fetch('/api/admin/trigger-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sync failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['exchange-rate'] });
      queryClient.invalidateQueries({ queryKey: ['historical-rates'] });
    },
  });
}

// Hook for admin authentication check
export function useAdminAuth() {
  return useQuery<{ isAdmin: boolean; user: any }>({
    queryKey: ['admin', 'auth'],
    queryFn: async () => {
      const response = await fetch('/api/admin/auth-check');
      if (!response.ok) {
        throw new Error('Failed to check admin status');
      }
      return response.json();
    },
    staleTime: 300000, // Consider data stale after 5 minutes
    retry: false, // Don't retry on failure
  });
}

// Utility function to format relative time
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

// Utility function to format duration in milliseconds
export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  return `${seconds}s`;
}