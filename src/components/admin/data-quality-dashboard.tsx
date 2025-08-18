'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useDataQuality } from '@/lib/hooks/use-admin-data';
import { 
  Database, 
  Star, 
  TrendingUp, 
  BarChart3,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export function DataQualityDashboard() {
  const { data: metrics, isLoading, error } = useDataQuality();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-spacing-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-spacing-6">
              <Skeleton className="h-4 w-24 mb-spacing-2" />
              <Skeleton className="h-8 w-16 mb-spacing-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-spacing-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Data Quality Metrics</AlertTitle>
            <AlertDescription>
              Failed to load data quality information. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  const getQualityBadgeVariant = (score: number) => {
    if (score >= 95) return "default"; // Green
    if (score >= 85) return "secondary"; // Blue
    return "destructive"; // Red
  };
  
  const getQualityLabel = (score: number) => {
    if (score >= 95) return "Excellent";
    if (score >= 85) return "Good";
    if (score >= 70) return "Fair";
    return "Poor";
  };
  
  return (
    <div className="space-y-spacing-6">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-spacing-6">
        {/* Total Records Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-spacing-2">
              <Database className="h-5 w-5" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics?.totalRecords?.toLocaleString() || '0'}
            </div>
            <p className="text-sm text-muted-foreground">
              Exchange rate records in database
            </p>
          </CardContent>
        </Card>
        
        {/* Quality Score Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-spacing-2">
              <Star className="h-5 w-5" />
              Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-spacing-2 mb-spacing-2">
              <div className="text-3xl font-bold">
                {metrics?.qualityScore || 0}%
              </div>
              <Badge variant={getQualityBadgeVariant(metrics?.qualityScore || 0)}>
                {getQualityLabel(metrics?.qualityScore || 0)}
              </Badge>
            </div>
            <Progress value={metrics?.qualityScore || 0} className="h-2 mb-spacing-2" />
            <p className="text-sm text-muted-foreground">
              Based on data completeness and accuracy
            </p>
          </CardContent>
        </Card>
        
        {/* Interpolated Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-spacing-2">
              <TrendingUp className="h-5 w-5" />
              Interpolated Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics?.interpolatedRates?.toLocaleString() || '0'}
            </div>
            <p className="text-sm text-muted-foreground">
              {metrics?.totalRecords && metrics?.interpolatedRates
                ? ((metrics.interpolatedRates / metrics.totalRecords) * 100).toFixed(1)
                : '0'}% of total records
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Data Sources and Missing Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-spacing-6">
        {/* Data Sources Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-spacing-2">
              <BarChart3 className="h-5 w-5" />
              Data Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-spacing-3">
              {Object.entries(metrics?.recordsBySource || {}).map(([source, count]) => {
                const percentage = metrics?.totalRecords 
                  ? ((count / metrics.totalRecords) * 100).toFixed(1)
                  : '0';
                
                return (
                  <div key={source} className="flex items-center justify-between">
                    <div className="flex items-center gap-spacing-2">
                      <div className={`w-3 h-3 rounded-full ${
                        source === 'ECB' ? 'bg-blue-500' : 
                        source === 'COINGECKO' ? 'bg-orange-500' : 'bg-gray-500'
                      }`} />
                      <span className="text-sm font-medium">{source}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{count.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {percentage}%
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Progress bars for visual representation */}
              <div className="space-y-spacing-2 pt-spacing-2">
                {Object.entries(metrics?.recordsBySource || {}).map(([source, count]) => {
                  const percentage = metrics?.totalRecords 
                    ? (count / metrics.totalRecords) * 100
                    : 0;
                  
                  return (
                    <div key={`${source}-progress`} className="space-y-spacing-1">
                      <div className="flex justify-between text-xs">
                        <span>{source}</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={percentage} className="h-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Missing Dates Alert */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-spacing-2 ${
              (metrics?.missingDates?.length || 0) > 0 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {(metrics?.missingDates?.length || 0) > 0 ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              Data Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-spacing-2">
              {(metrics?.missingDates?.length || 0) === 0 ? (
                <span className="text-green-600">Complete</span>
              ) : (
                <span className="text-orange-600">
                  {metrics.missingDates.length} gaps
                </span>
              )}
            </div>
            
            {(metrics?.missingDates?.length || 0) > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-spacing-3">
                  Missing business day data
                </p>
                <div className="flex flex-wrap gap-spacing-1 max-h-24 overflow-y-auto">
                  {metrics.missingDates.slice(0, 8).map(date => (
                    <Badge key={date} variant="outline" className="text-xs">
                      {date}
                    </Badge>
                  ))}
                  {metrics.missingDates.length > 8 && (
                    <Badge variant="secondary" className="text-xs">
                      +{metrics.missingDates.length - 8} more
                    </Badge>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                All business days have data coverage
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Currency Pair Coverage (if available) */}
      {metrics?.currencyPairCoverage && Object.keys(metrics.currencyPairCoverage).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Currency Pair Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-spacing-2 max-h-40 overflow-y-auto">
              {Object.entries(metrics.currencyPairCoverage)
                .slice(0, 20) // Limit display
                .map(([pair, count]) => (
                <div key={pair} className="text-center p-spacing-2 border rounded">
                  <div className="font-mono text-sm">{pair}</div>
                  <div className="text-xs text-muted-foreground">
                    {count.toLocaleString()} records
                  </div>
                </div>
              ))}
            </div>
            {Object.keys(metrics.currencyPairCoverage).length > 20 && (
              <p className="text-sm text-muted-foreground mt-spacing-2">
                Showing 20 of {Object.keys(metrics.currencyPairCoverage).length} currency pairs
              </p>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Last Updated */}
      <div className="text-sm text-muted-foreground">
        Last updated: {metrics?.lastUpdated ? new Date(metrics.lastUpdated).toLocaleString() : 'Never'}
      </div>
    </div>
  );
}