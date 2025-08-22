'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  Clock, 
  Download, 
  RefreshCw, 
  Settings, 
  Activity,
  AlertCircle,
  CheckCircle,
  Database,
  FileText,
  Play,
  Pause,
  Trash2,
  TrendingUp,
  Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

// Types
interface SyncConfiguration {
  startDate: string;
  autoSyncEnabled: boolean;
  syncTime: string;
  trackedCurrencies: string[];
}

interface SyncStatus {
  id: string;
  syncType: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  newRatesInserted: number;
  ratesUpdated: number;
  ratesDeleted: number;
  ratesUnchanged: number;
  errorMessage?: string;
}

interface SyncStatistics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageDurationMs: number;
  totalRatesInserted: number;
  totalRatesUpdated: number;
  lastSuccessfulSync?: string;
  lastFailedSync?: string;
}

interface Currency {
  code: string;
  displayName: string;
  symbol: string;
  isTracked: boolean;
}

interface SyncLog {
  id: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  phase: string;
  message: string;
  details?: any;
  timestamp: string;
}

export default function ExchangeRateManager() {
  const [configuration, setConfiguration] = useState<SyncConfiguration | null>(null);
  const [currentStatus, setCurrentStatus] = useState<SyncStatus | null>(null);
  const [statistics, setStatistics] = useState<SyncStatistics | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const supabase = createClient();

  // Load initial data
  useEffect(() => {
    loadAllData();
    
    // Set up real-time subscription for sync status
    const channel = supabase
      .channel('sync-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sync_history'
      }, () => {
        loadSyncStatus();
        loadStatistics();
        loadSyncHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadConfiguration(),
      loadSyncStatus(),
      loadStatistics(),
      loadCurrencies(),
      loadSyncHistory()
    ]);
    setIsLoading(false);
  };

  const loadConfiguration = async () => {
    const { data, error } = await supabase
      .rpc('get_sync_configuration');
    
    if (!error && data?.[0]) {
      setConfiguration({
        startDate: data[0].start_date,
        autoSyncEnabled: data[0].auto_sync_enabled,
        syncTime: data[0].sync_time,
        trackedCurrencies: data[0].tracked_currencies || []
      });
    }
  };

  const loadSyncStatus = async () => {
    const { data, error } = await supabase
      .rpc('get_latest_sync_status');
    
    if (!error && data?.[0]) {
      setCurrentStatus({
        id: data[0].id,
        syncType: data[0].sync_type,
        status: data[0].status,
        startedAt: data[0].started_at,
        completedAt: data[0].completed_at,
        durationMs: data[0].duration_ms,
        newRatesInserted: data[0].new_rates_inserted || 0,
        ratesUpdated: data[0].rates_updated || 0,
        ratesDeleted: data[0].rates_deleted || 0,
        ratesUnchanged: data[0].rates_unchanged || 0,
        errorMessage: data[0].error_message
      });
      setIsSyncing(data[0].status === 'running');
    }
  };

  const loadStatistics = async () => {
    const { data, error } = await supabase
      .rpc('get_sync_statistics', { p_days: 30 });
    
    if (!error && data?.[0]) {
      setStatistics({
        totalSyncs: data[0].total_syncs || 0,
        successfulSyncs: data[0].successful_syncs || 0,
        failedSyncs: data[0].failed_syncs || 0,
        averageDurationMs: data[0].average_duration_ms || 0,
        totalRatesInserted: data[0].total_rates_inserted || 0,
        totalRatesUpdated: data[0].total_rates_updated || 0,
        lastSuccessfulSync: data[0].last_successful_sync,
        lastFailedSync: data[0].last_failed_sync
      });
    }
  };

  const loadCurrencies = async () => {
    const { data, error } = await supabase
      .from('currency_configuration')
      .select('*')
      .eq('source', 'ECB')
      .order('currency_code');
    
    if (!error && data) {
      setCurrencies(data.map(c => ({
        code: c.currency_code,
        displayName: c.display_name,
        symbol: c.currency_symbol || '',
        isTracked: c.is_tracked
      })));
    }
  };

  const loadSyncHistory = async () => {
    const { data, error } = await supabase
      .from('sync_history')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);
    
    if (!error && data) {
      setSyncHistory(data.map(h => ({
        id: h.id,
        syncType: h.sync_type,
        status: h.status,
        startedAt: h.started_at,
        completedAt: h.completed_at,
        durationMs: h.duration_ms,
        newRatesInserted: h.new_rates_inserted || 0,
        ratesUpdated: h.rates_updated || 0,
        ratesDeleted: h.rates_deleted || 0,
        ratesUnchanged: h.rates_unchanged || 0,
        errorMessage: h.error_message
      })));
    }
  };

  const loadSyncLogs = async (syncId: string) => {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_history_id', syncId)
      .order('timestamp');
    
    if (!error && data) {
      setSyncLogs(data.map(log => ({
        id: log.id,
        level: log.log_level,
        phase: log.phase,
        message: log.message,
        details: log.details,
        timestamp: log.timestamp
      })));
    }
  };

  const triggerManualSync = async () => {
    setIsSyncing(true);
    
    try {
      const response = await fetch('/api/admin/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'manual' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }
      
      // Reload status
      await loadSyncStatus();
      await loadStatistics();
      
    } catch (error) {
      console.error('Sync trigger failed:', error);
      setIsSyncing(false);
    }
  };

  const updateConfiguration = async (updates: Partial<SyncConfiguration>) => {
    try {
      // Update configuration
      if (updates.startDate || updates.autoSyncEnabled !== undefined || updates.syncTime) {
        const { error } = await supabase.rpc('update_sync_configuration', {
          p_start_date: updates.startDate || null,
          p_auto_sync_enabled: updates.autoSyncEnabled ?? null,
          p_sync_time: updates.syncTime || null
        });
        
        if (error) throw error;
      }
      
      // Update tracked currencies
      if (updates.trackedCurrencies) {
        for (const currency of currencies) {
          const shouldTrack = updates.trackedCurrencies.includes(currency.code);
          if (currency.isTracked !== shouldTrack) {
            await supabase
              .from('currency_configuration')
              .update({ is_tracked: shouldTrack })
              .eq('currency_code', currency.code);
          }
        }
      }
      
      // Reload configuration
      await loadConfiguration();
      await loadCurrencies();
      
    } catch (error) {
      console.error('Failed to update configuration:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'running': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Exchange Rate Management</h2>
          <p className="text-gray-600">Configure and monitor ECB exchange rate synchronization</p>
        </div>
        <Button 
          onClick={triggerManualSync}
          disabled={isSyncing}
          size="lg"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Sync Now
            </>
          )}
        </Button>
      </div>

      {/* Status Banner */}
      {currentStatus && (
        <Alert className={currentStatus.status === 'failed' ? 'border-red-500' : ''}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getStatusIcon(currentStatus.status)}
              <div>
                <AlertTitle>
                  Last Sync: {currentStatus.status === 'running' ? 'In Progress' : currentStatus.status}
                </AlertTitle>
                <AlertDescription>
                  {currentStatus.status === 'running' ? (
                    `Started ${formatDistanceToNow(new Date(currentStatus.startedAt))} ago`
                  ) : currentStatus.completedAt ? (
                    `Completed ${formatDistanceToNow(new Date(currentStatus.completedAt))} ago`
                  ) : (
                    'No sync data available'
                  )}
                  {currentStatus.errorMessage && (
                    <span className="text-red-600 ml-2">{currentStatus.errorMessage}</span>
                  )}
                </AlertDescription>
              </div>
            </div>
            {currentStatus.status === 'completed' && (
              <div className="flex space-x-4 text-sm">
                <span className="text-green-600">+{currentStatus.newRatesInserted} new</span>
                <span className="text-blue-600">↻{currentStatus.ratesUpdated} updated</span>
                <span className="text-gray-500">={currentStatus.ratesUnchanged} unchanged</span>
                {currentStatus.ratesDeleted > 0 && (
                  <span className="text-red-600">-{currentStatus.ratesDeleted} deleted</span>
                )}
              </div>
            )}
          </div>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="logs">Debug Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Syncs (30d)</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.totalSyncs || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {statistics?.successfulSyncs || 0} successful, {statistics?.failedSyncs || 0} failed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics?.totalSyncs 
                    ? Math.round((statistics.successfulSyncs / statistics.totalSyncs) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg duration: {statistics?.averageDurationMs 
                    ? `${(statistics.averageDurationMs / 1000).toFixed(1)}s`
                    : 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rates Updated (30d)</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(statistics?.totalRatesInserted || 0) + (statistics?.totalRatesUpdated || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statistics?.totalRatesInserted || 0} new, {statistics?.totalRatesUpdated || 0} updated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tracked Currencies</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {configuration?.trackedCurrencies.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {configuration?.startDate || 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Sync Statistics</CardTitle>
              <CardDescription>Performance metrics for the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statistics?.lastSuccessfulSync && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Successful Sync</span>
                    <span className="text-sm font-medium">
                      {format(new Date(statistics.lastSuccessfulSync), 'PPpp')}
                    </span>
                  </div>
                )}
                {statistics?.lastFailedSync && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Failed Sync</span>
                    <span className="text-sm font-medium text-red-600">
                      {format(new Date(statistics.lastFailedSync), 'PPpp')}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Auto-Sync Status</span>
                  <Badge variant={configuration?.autoSyncEnabled ? 'default' : 'secondary'}>
                    {configuration?.autoSyncEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Scheduled Time</span>
                  <span className="text-sm font-medium">{configuration?.syncTime || 'N/A'} UTC</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Configuration</CardTitle>
              <CardDescription>Configure automatic synchronization settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-sync">Automatic Daily Sync</Label>
                  <p className="text-sm text-gray-600">
                    Automatically download and sync ECB rates daily
                  </p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={configuration?.autoSyncEnabled || false}
                  onCheckedChange={(checked) => 
                    updateConfiguration({ autoSyncEnabled: checked })
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="sync-time">Daily Sync Time (UTC)</Label>
                <Input
                  id="sync-time"
                  type="time"
                  value={configuration?.syncTime || '17:00'}
                  onChange={(e) => 
                    updateConfiguration({ syncTime: e.target.value })
                  }
                />
                <p className="text-sm text-gray-600">
                  ECB updates rates around 16:00 CET. Current setting runs at {configuration?.syncTime} UTC.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="start-date">Historical Data Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={configuration?.startDate || '2017-01-01'}
                  onChange={(e) => 
                    updateConfiguration({ startDate: e.target.value })
                  }
                />
                <p className="text-sm text-gray-600">
                  Only sync rates from this date forward. Older data will be removed.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currencies Tab */}
        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tracked Currencies</CardTitle>
              <CardDescription>
                Select which currencies to extract from the ECB data feed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currencies.map((currency) => (
                  <div key={currency.code} className="flex items-center space-x-2">
                    <Checkbox
                      id={currency.code}
                      checked={currency.isTracked}
                      onCheckedChange={(checked) => {
                        const newTracked = checked 
                          ? [...(configuration?.trackedCurrencies || []), currency.code]
                          : (configuration?.trackedCurrencies || []).filter(c => c !== currency.code);
                        updateConfiguration({ trackedCurrencies: newTracked });
                      }}
                    />
                    <Label
                      htmlFor={currency.code}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      <span className="font-mono">{currency.code}</span>
                      <span className="ml-2 text-gray-600">{currency.displayName}</span>
                    </Label>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium">About Currency Selection</p>
                    <p className="mt-1">
                      Selected currencies will be tracked and cross-rates will be calculated automatically.
                      EUR is always included as it's the ECB base currency.
                      Changes take effect on the next sync.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>Recent synchronization operations</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {syncHistory.map((sync) => (
                    <div
                      key={sync.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setActiveTab('logs');
                        loadSyncLogs(sync.id);
                      }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={getStatusColor(sync.status)}>
                          {getStatusIcon(sync.status)}
                        </div>
                        <div>
                          <div className="font-medium">
                            {sync.syncType === 'manual' ? 'Manual' : 'Scheduled'} Sync
                          </div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(sync.startedAt), 'PPp')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          {sync.status === 'completed' && sync.durationMs && (
                            <span>{(sync.durationMs / 1000).toFixed(1)}s</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 space-x-2">
                          {sync.newRatesInserted > 0 && (
                            <span>+{sync.newRatesInserted}</span>
                          )}
                          {sync.ratesUpdated > 0 && (
                            <span>↻{sync.ratesUpdated}</span>
                          )}
                          {sync.ratesDeleted > 0 && (
                            <span>-{sync.ratesDeleted}</span>
                          )}
                        </div>
                        {sync.errorMessage && (
                          <div className="text-xs text-red-600 mt-1">
                            {sync.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debug Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debug Logs</CardTitle>
              <CardDescription>
                {syncLogs.length > 0 
                  ? 'Detailed logs for troubleshooting sync issues'
                  : 'Select a sync from the History tab to view its logs'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncLogs.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2 font-mono text-xs">
                    {syncLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-2 rounded ${getLogLevelColor(log.level)}`}
                      >
                        <div className="flex items-start space-x-2">
                          <span className="text-gray-500">
                            {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                          </span>
                          <span className="font-semibold uppercase">
                            [{log.phase}]
                          </span>
                          <span className="flex-1">{log.message}</span>
                        </div>
                        {log.details && (
                          <pre className="mt-1 ml-20 text-gray-600">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <FileText className="h-8 w-8" />
                  <span className="ml-2">No logs selected</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}