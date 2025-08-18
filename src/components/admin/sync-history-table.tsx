'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useSyncHistory, formatRelativeTime, formatDuration } from '@/lib/hooks/use-admin-data';
import { 
  History, 
  MoreHorizontal,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Euro,
  Bitcoin
} from 'lucide-react';

export function SyncHistoryTable() {
  const { data: history, isLoading, error, refetch } = useSyncHistory();
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case 'failure':
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="secondary" className="text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Partial
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Unknown
          </Badge>
        );
    }
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fiat':
        return <Euro className="h-4 w-4" />;
      case 'crypto':
        return <Bitcoin className="h-4 w-4" />;
      case 'both':
        return <TrendingUp className="h-4 w-4" />;
      case 'backfill':
        return <History className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fiat': return 'Fiat Only';
      case 'crypto': return 'Crypto Only';
      case 'both': return 'Fiat + Crypto';
      case 'backfill': return 'Backfill';
      default: return type;
    }
  };
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-spacing-2">
            <History className="h-5 w-5" />
            Recent Sync History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Sync History</AlertTitle>
            <AlertDescription>
              Failed to load synchronization history. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-spacing-2">
              <History className="h-5 w-5" />
              Recent Sync History
            </CardTitle>
            <CardDescription>
              Last 20 synchronization operations across all data sources
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-spacing-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-spacing-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <div className="text-center py-spacing-8">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-spacing-4" />
            <h3 className="text-lg font-semibold">No Sync History</h3>
            <p className="text-muted-foreground">
              No synchronization history is available yet. Try running a manual sync to see results here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Rates</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="space-y-spacing-1">
                        <div className="text-sm font-medium">
                          {formatRelativeTime(entry.timestamp)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleDateString()} {' '}
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-spacing-2">
                        {getTypeIcon(entry.type)}
                        <Badge variant="outline" className="text-xs font-medium">
                          {getTypeLabel(entry.type)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(entry.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium">
                        {entry.ratesProcessed.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        records
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium font-mono">
                        {formatDuration(entry.duration)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-spacing-2" />
                            View Details
                          </DropdownMenuItem>
                          {entry.status === 'failure' && (
                            <DropdownMenuItem>
                              <RefreshCw className="h-4 w-4 mr-spacing-2" />
                              Retry Sync
                            </DropdownMenuItem>
                          )}
                          {entry.errorMessage && (
                            <DropdownMenuItem>
                              <AlertTriangle className="h-4 w-4 mr-spacing-2" />
                              View Error
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Summary Statistics */}
        {history && history.length > 0 && (
          <div className="mt-spacing-6 pt-spacing-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-spacing-4 text-center">
              <div>
                <div className="text-2xl font-bold">
                  {history.filter(h => h.status === 'success').length}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {history.filter(h => h.status === 'failure').length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {history.reduce((sum, h) => sum + h.ratesProcessed, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Rates</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatDuration(
                    history.reduce((sum, h) => sum + h.duration, 0) / history.length
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Avg Duration</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Refresh Information */}
        <div className="mt-spacing-4 text-xs text-muted-foreground">
          Auto-refreshes every 30 seconds. Last updated: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}