'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemHealth, formatRelativeTime } from '@/lib/hooks/use-admin-data';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info
} from 'lucide-react';

export function SystemHealthCard() {
  const { data: health, isLoading, error } = useSystemHealth();
  
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Info className="h-5 w-5 text-gray-600" />;
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-spacing-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-spacing-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-spacing-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
          <div className="mt-spacing-6 space-y-spacing-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-spacing-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-spacing-8">
            <div className="text-center">
              <XCircle className="h-8 w-8 text-red-500 mx-auto mb-spacing-2" />
              <p className="text-sm text-muted-foreground">Failed to load system health</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-spacing-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-spacing-4">
          {/* Status */}
          <div className="space-y-spacing-2">
            <div className="flex items-center gap-spacing-2">
              {getStatusIcon(health?.status)}
              <span className="text-sm font-medium">Status</span>
            </div>
            <div className={`text-2xl font-bold ${getStatusColor(health?.status)} capitalize`}>
              {health?.status || 'Unknown'}
            </div>
          </div>
          
          {/* Last Sync */}
          <div className="space-y-spacing-2">
            <div className="text-sm font-medium text-muted-foreground">Last Sync</div>
            <div className="text-2xl font-bold">
              {health?.lastSyncDate ? formatRelativeTime(health.lastSyncDate + 'T00:00:00Z') : 'Never'}
            </div>
            {health?.lastSyncDate && (
              <div className="text-xs text-muted-foreground">
                {health.lastSyncDate}
              </div>
            )}
          </div>
          
          {/* Available Rates */}
          <div className="space-y-spacing-2">
            <div className="text-sm font-medium text-muted-foreground">Available Rates</div>
            <div className="text-2xl font-bold">
              {health?.ratesAvailable?.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-muted-foreground">
              Total records
            </div>
          </div>
          
          {/* Data Gaps */}
          <div className="space-y-spacing-2">
            <div className="text-sm font-medium text-muted-foreground">Data Gaps</div>
            <div className={`text-2xl font-bold ${
              (health?.gapsDetected || 0) > 5 ? 'text-red-600' :
              (health?.gapsDetected || 0) > 0 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {health?.gapsDetected || '0'}
            </div>
            <div className="text-xs text-muted-foreground">
              Interpolated rates
            </div>
          </div>
        </div>
        
        {/* Error Rate */}
        <div className="mt-spacing-6 grid grid-cols-2 gap-spacing-4">
          <div className="space-y-spacing-2">
            <div className="text-sm font-medium text-muted-foreground">Error Rate (24h)</div>
            <div className={`text-xl font-bold ${
              (health?.errorRate || 0) > 5 ? 'text-red-600' :
              (health?.errorRate || 0) > 2 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {health?.errorRate || '0'} errors
            </div>
          </div>
          
          <div className="space-y-spacing-2">
            <div className="text-sm font-medium text-muted-foreground">System Uptime (30d)</div>
            <div className="text-xl font-bold">
              {health?.uptimePercent?.toFixed(1) || '0.0'}%
            </div>
          </div>
        </div>
        
        {/* Uptime Progress Bar */}
        <div className="mt-spacing-4 space-y-spacing-2">
          <div className="flex justify-between text-sm">
            <span>Uptime Percentage</span>
            <span className={
              (health?.uptimePercent || 0) >= 95 ? 'text-green-600' :
              (health?.uptimePercent || 0) >= 85 ? 'text-yellow-600' : 'text-red-600'
            }>
              {health?.uptimePercent?.toFixed(1) || '0'}%
            </span>
          </div>
          <Progress 
            value={health?.uptimePercent || 0} 
            className="h-2"
          />
        </div>
        
        {/* Last Error */}
        {health?.lastError && (
          <div className="mt-spacing-4 p-spacing-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm font-medium text-red-800 mb-spacing-1">Last Error</div>
            <div className="text-sm text-red-700">{health.lastError}</div>
          </div>
        )}
        
        {/* Status Legend */}
        <div className="mt-spacing-6 pt-spacing-4 border-t">
          <div className="text-xs text-muted-foreground mb-spacing-2">Status Indicators:</div>
          <div className="flex flex-wrap gap-spacing-4 text-xs">
            <div className="flex items-center gap-spacing-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Healthy: All systems operational</span>
            </div>
            <div className="flex items-center gap-spacing-1">
              <AlertTriangle className="h-3 w-3 text-yellow-600" />
              <span>Warning: Minor issues detected</span>
            </div>
            <div className="flex items-center gap-spacing-1">
              <XCircle className="h-3 w-3 text-red-600" />
              <span>Critical: System attention required</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}