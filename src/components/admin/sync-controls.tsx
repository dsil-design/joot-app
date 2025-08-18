'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useTriggerSync } from '@/lib/hooks/use-admin-data';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Loader2,
  Settings,
  Database,
  Calendar,
  AlertTriangle,
  Euro,
  Bitcoin
} from 'lucide-react';

export function SyncControls() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [syncType, setSyncType] = useState<'fiat' | 'crypto' | 'both'>('both');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const triggerSyncMutation = useTriggerSync();
  
  const handleSync = async (options: {
    type: 'fiat' | 'crypto' | 'both' | 'backfill';
    date?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      await triggerSyncMutation.mutateAsync(options);
      
      toast.success(`${options.type} sync completed successfully!`, {
        description: `Sync operation finished. Check the sync history for details.`
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`${options.type} sync failed`, {
        description: errorMessage
      });
    }
  };
  
  const isLoading = triggerSyncMutation.isPending;
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-spacing-2">
          <RefreshCw className="h-5 w-5" />
          Manual Sync Controls
        </CardTitle>
        <CardDescription>
          Trigger manual synchronization of exchange rates from various sources
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-spacing-4">
        {/* Sync Type Selection */}
        <div className="space-y-spacing-2">
          <Label>Sync Type</Label>
          <RadioGroup value={syncType} onValueChange={(value) => setSyncType(value as 'fiat' | 'crypto' | 'both')}>
            <div className="flex items-center space-x-spacing-2">
              <RadioGroupItem value="both" id="both" />
              <Label htmlFor="both" className="cursor-pointer">
                Both (Fiat + Crypto) - Recommended
              </Label>
            </div>
            <div className="flex items-center space-x-spacing-2">
              <RadioGroupItem value="fiat" id="fiat" />
              <Label htmlFor="fiat" className="cursor-pointer">
                Fiat Only (ECB rates)
              </Label>
            </div>
            <div className="flex items-center space-x-spacing-2">
              <RadioGroupItem value="crypto" id="crypto" />
              <Label htmlFor="crypto" className="cursor-pointer">
                Crypto Only (Bitcoin from CoinGecko)
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        {/* Date Selection */}
        <div className="space-y-spacing-2">
          <Label htmlFor="target-date">Target Date (optional)</Label>
          <Input
            id="target-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={today}
            placeholder="Leave empty for latest available date"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to sync the most recent available data. For fiat currencies, 
            this excludes weekends and holidays.
          </p>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-spacing-2">
          <Button
            onClick={() => handleSync({ 
              type: syncType, 
              date: selectedDate || undefined 
            })}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-spacing-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-spacing-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleSync({ type: 'fiat', date: selectedDate || undefined })}
            disabled={isLoading}
          >
            <Euro className="mr-spacing-2 h-4 w-4" />
            ECB Only
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleSync({ type: 'crypto', date: selectedDate || undefined })}
            disabled={isLoading}
          >
            <Bitcoin className="mr-spacing-2 h-4 w-4" />
            BTC Only
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={isLoading}
          >
            <Settings className="mr-spacing-2 h-4 w-4" />
            Advanced
          </Button>
        </div>
        
        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-spacing-4 p-spacing-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium">Advanced Operations</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-4">
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm('This will backfill ALL data from 2015 to present. This may take several minutes and consume API quota. Continue?')) {
                    handleSync({ 
                      type: 'backfill',
                      startDate: '2015-01-01',
                      endDate: today
                    });
                  }
                }}
                disabled={isLoading}
                className="w-full"
              >
                <Database className="mr-spacing-2 h-4 w-4" />
                Full Backfill (2015-Present)
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleSync({ 
                  type: 'backfill',
                  startDate: '2024-01-01',
                  endDate: today
                })}
                disabled={isLoading}
                className="w-full"
              >
                <Calendar className="mr-spacing-2 h-4 w-4" />
                Backfill 2024 Only
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  const last30Days = new Date();
                  last30Days.setDate(last30Days.getDate() - 30);
                  handleSync({ 
                    type: 'both',
                    startDate: last30Days.toISOString().split('T')[0],
                    endDate: today
                  });
                }}
                disabled={isLoading}
                className="w-full"
              >
                <Calendar className="mr-spacing-2 h-4 w-4" />
                Sync Last 30 Days
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  const last7Days = new Date();
                  last7Days.setDate(last7Days.getDate() - 7);
                  handleSync({ 
                    type: 'both',
                    startDate: last7Days.toISOString().split('T')[0],
                    endDate: today
                  });
                }}
                disabled={isLoading}
                className="w-full"
              >
                <Calendar className="mr-spacing-2 h-4 w-4" />
                Sync Last 7 Days
              </Button>
            </div>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important Notes</AlertTitle>
              <AlertDescription className="space-y-spacing-2">
                <p>• <strong>Backfill operations</strong> may take several minutes and should only be used when necessary.</p>
                <p>• <strong>API Limits:</strong> CoinGecko free tier allows 50 requests/minute. Large backfills are rate-limited.</p>
                <p>• <strong>ECB Data:</strong> Only available for business days. Weekends and holidays are automatically handled.</p>
                <p>• <strong>Crypto Data:</strong> Available 24/7 including weekends and holidays.</p>
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {/* Status Information */}
        <div className="pt-spacing-4 border-t">
          <div className="text-sm text-muted-foreground space-y-spacing-1">
            <p><strong>Data Sources:</strong></p>
            <ul className="list-disc list-inside pl-spacing-4 space-y-spacing-1">
              <li>Fiat currencies: European Central Bank (ECB) - Updates on business days</li>
              <li>Bitcoin: CoinGecko API - Updates daily including weekends</li>
              <li>Gap filling: Automatic interpolation for missing business days</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}