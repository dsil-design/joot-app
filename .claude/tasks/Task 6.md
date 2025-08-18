# Task 6: Admin Interface & Monitoring Dashboard

## Objective
Create admin tools to monitor exchange rate data quality, trigger manual syncs, and view system health.

## Files to Create
- `src/pages/admin/exchange-rates.tsx`
- `src/components/admin/system-health-card.tsx`
- `src/components/admin/data-quality-dashboard.tsx`
- `src/components/admin/sync-controls.tsx`
- `src/components/admin/rate-explorer.tsx`
- `src/components/admin/sync-history-table.tsx`
- `src/components/layouts/admin-layout.tsx`
- `src/lib/services/monitoring-service.ts`
- `src/lib/hooks/use-admin-data.ts`
- `src/pages/api/admin/trigger-sync.ts`
- `src/pages/api/admin/system-health.ts`
- `src/pages/api/admin/data-quality.ts`

## Requirements

### 1. Admin Dashboard Page (`src/pages/admin/exchange-rates.tsx`)

#### Main Dashboard Layout
```typescript
import { AdminLayout } from '@/components/layouts/admin-layout'
import { SystemHealthCard } from '@/components/admin/system-health-card'
import { DataQualityDashboard } from '@/components/admin/data-quality-dashboard'
import { SyncControls } from '@/components/admin/sync-controls'
import { RateExplorer } from '@/components/admin/rate-explorer'
import { SyncHistoryTable } from '@/components/admin/sync-history-table'

export default function AdminExchangeRatesPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Exchange Rate Management</h1>
          <Badge variant="secondary">Admin Dashboard</Badge>
        </div>
        
        {/* System Health Overview */}
        <SystemHealthCard />
        
        {/* Data Quality Metrics */}
        <DataQualityDashboard />
        
        {/* Manual Sync Controls */}
        <SyncControls />
        
        {/* Exchange Rate Explorer */}
        <RateExplorer />
        
        {/* Recent Sync History */}
        <SyncHistoryTable />
      </div>
    </AdminLayout>
  );
}

// Server-side authentication
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createServerClient(context);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !await isAdminUser(user)) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
  
  return { props: {} };
}
```

### 2. System Health Card (`src/components/admin/system-health-card.tsx`)

#### Health Status Display
```typescript
interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  lastSyncDate: string;
  ratesAvailable: number;
  gapsDetected: number;
  errorRate: number;
  uptimePercent: number;
}

export function SystemHealthCard() {
  const { data: health, isLoading } = useSystemHealth();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  const getStatusIcon = (status: string) => {
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
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(health?.status)}
              <span className="text-sm font-medium">Status</span>
            </div>
            <div className={`text-2xl font-bold ${getStatusColor(health?.status)}`}>
              {health?.status || 'Unknown'}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Last Sync</div>
            <div className="text-2xl font-bold">
              {health?.lastSyncDate ? formatRelativeTime(health.lastSyncDate) : 'N/A'}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Available Rates</div>
            <div className="text-2xl font-bold">
              {health?.ratesAvailable?.toLocaleString() || '0'}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Data Gaps</div>
            <div className={`text-2xl font-bold ${health?.gapsDetected > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {health?.gapsDetected || '0'}
            </div>
          </div>
        </div>
        
        {/* Uptime Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span>System Uptime</span>
            <span>{health?.uptimePercent?.toFixed(1) || '0'}%</span>
          </div>
          <Progress value={health?.uptimePercent || 0} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Data Quality Dashboard (`src/components/admin/data-quality-dashboard.tsx`)

#### Quality Metrics & Visualizations
```typescript
interface DataQualityMetrics {
  totalRecords: number;
  recordsBySource: Record<string, number>;
  interpolatedRates: number;
  missingDates: string[];
  latestRates: ExchangeRate[];
  qualityScore: number;
  currencyPairCoverage: Record<string, number>;
}

export function DataQualityDashboard() {
  const { data: metrics, isLoading } = useDataQuality();
  
  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Total Records Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Total Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {metrics?.totalRecords.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground">
            Exchange rate records in database
          </p>
        </CardContent>
      </Card>
      
      {/* Quality Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Quality Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-3xl font-bold">
              {metrics?.qualityScore}%
            </div>
            <Badge 
              variant={metrics?.qualityScore >= 95 ? "default" : 
                      metrics?.qualityScore >= 85 ? "secondary" : "destructive"}
            >
              {metrics?.qualityScore >= 95 ? "Excellent" : 
               metrics?.qualityScore >= 85 ? "Good" : "Needs Attention"}
            </Badge>
          </div>
          <Progress value={metrics?.qualityScore} className="h-2" />
        </CardContent>
      </Card>
      
      {/* Interpolated Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Interpolated Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {metrics?.interpolatedRates?.toLocaleString() || '0'}
          </div>
          <p className="text-sm text-muted-foreground">
            {((metrics?.interpolatedRates / metrics?.totalRecords) * 100).toFixed(1)}% of total
          </p>
        </CardContent>
      </Card>
      
      {/* Data Sources Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Data Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(metrics?.recordsBySource || {}).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    source === 'ECB' ? 'bg-blue-500' : 
                    source === 'COINGECKO' ? 'bg-orange-500' : 'bg-gray-500'
                  }`} />
                  <span className="text-sm font-medium">{source}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{count.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {((count / metrics?.totalRecords) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Missing Dates Alert */}
      {metrics?.missingDates.length > 0 && (
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-orange-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Missing Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {metrics.missingDates.length}
            </div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### 4. Manual Sync Controls (`src/components/admin/sync-controls.tsx`)

#### Sync Operation Interface
```typescript
interface SyncOptions {
  type: 'fiat' | 'crypto' | 'both' | 'backfill';
  date?: string;
  startDate?: string;
  endDate?: string;
}

export function SyncControls() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [syncType, setSyncType] = useState<'fiat' | 'crypto' | 'both'>('both');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const triggerSync = async (options: SyncOptions) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/trigger-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Sync completed: ${result.message}`);
      } else {
        toast.error(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Sync request failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Manual Sync Controls
        </CardTitle>
        <CardDescription>
          Trigger manual synchronization of exchange rates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Type Selection */}
        <div className="space-y-2">
          <Label>Sync Type</Label>
          <RadioGroup value={syncType} onValueChange={setSyncType}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="both" id="both" />
              <Label htmlFor="both">Both (Fiat + Crypto)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fiat" id="fiat" />
              <Label htmlFor="fiat">Fiat Only (ECB)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="crypto" id="crypto" />
              <Label htmlFor="crypto">Crypto Only (BTC)</Label>
            </div>
          </RadioGroup>
        </div>
        
        {/* Date Selection */}
        <div className="space-y-2">
          <Label>Target Date (optional)</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            placeholder="Leave empty for latest available date"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to sync the most recent available data
          </p>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            onClick={() => triggerSync({ 
              type: syncType, 
              date: selectedDate || undefined 
            })}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => triggerSync({ type: 'fiat' })}
            disabled={isLoading}
          >
            <Euro className="mr-2 h-4 w-4" />
            ECB Only
          </Button>
          
          <Button
            variant="outline"
            onClick={() => triggerSync({ type: 'crypto' })}
            disabled={isLoading}
          >
            <Bitcoin className="mr-2 h-4 w-4" />
            BTC Only
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={isLoading}
          >
            <Settings className="mr-2 h-4 w-4" />
            Advanced
          </Button>
        </div>
        
        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium">Advanced Operations</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm('This will backfill ALL data from 2015. This may take several minutes. Continue?')) {
                    triggerSync({ 
                      type: 'backfill',
                      startDate: '2015-01-01' 
                    });
                  }
                }}
                disabled={isLoading}
              >
                <Database className="mr-2 h-4 w-4" />
                Full Backfill (2015-Present)
              </Button>
              
              <Button
                variant="outline"
                onClick={() => triggerSync({ 
                  type: 'both',
                  startDate: '2024-01-01',
                  endDate: new Date().toISOString().split('T')[0]
                })}
                disabled={isLoading}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Sync 2024 Only
              </Button>
            </div>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Advanced operations may take several minutes and should only be used when necessary.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 5. Rate Explorer (`src/components/admin/rate-explorer.tsx`)

#### Interactive Rate Lookup
```typescript
const CURRENCIES: CurrencyType[] = ['USD', 'THB', 'EUR', 'GBP', 'SGD', 'VND', 'MYR', 'BTC'];

export function RateExplorer() {
  const [fromCurrency, setFromCurrency] = useState<CurrencyType>('USD');
  const [toCurrency, setToCurrency] = useState<CurrencyType>('THB');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const { data: rate, isLoading, error } = useExchangeRate(fromCurrency, toCurrency, selectedDate);
  const { data: historicalRates } = useHistoricalRates(fromCurrency, toCurrency, 30);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Exchange Rate Explorer
        </CardTitle>
        <CardDescription>
          Look up exchange rates for specific currency pairs and dates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>From Currency</Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>To Currency</Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Exchange Rate</Label>
            <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : error ? (
                <span className="text-red-500 text-sm">Error</span>
              ) : rate ? (
                <span className="font-medium">
                  {rate.rate.toLocaleString(undefined, { 
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 6 
                  })}
                </span>
              ) : (
                <span className="text-muted-foreground">No data</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Rate Details */}
        {rate && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Source</div>
              <div className="font-medium">{rate.source}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">{rate.date}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Type</div>
              <div className="font-medium">
                {rate.is_interpolated ? 'Interpolated' : 'Actual'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Created</div>
              <div className="font-medium">
                {formatRelativeTime(rate.created_at)}
              </div>
            </div>
          </div>
        )}
        
        {rate?.is_interpolated && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Interpolated Rate</AlertTitle>
            <AlertDescription>
              This rate was interpolated from {rate.interpolated_from_date} due to missing data for the requested date.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFromCurrency(toCurrency);
              setToCurrency(fromCurrency);
            }}
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Swap Currencies
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              setSelectedDate(yesterday.toISOString().split('T')[0]);
            }}
          >
            <Clock className="h-4 w-4 mr-2" />
            Yesterday
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 6. Sync History Table (`src/components/admin/sync-history-table.tsx`)

#### Recent Sync Operations
```typescript
interface SyncHistoryEntry {
  id: string;
  timestamp: string;
  type: 'fiat' | 'crypto' | 'both' | 'backfill';
  status: 'success' | 'failure' | 'partial';
  ratesProcessed: number;
  duration: number;
  errorMessage?: string;
}

export function SyncHistoryTable() {
  const { data: history, isLoading } = useSyncHistory();
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default">Success</Badge>;
      case 'failure':
        return <Badge variant="destructive">Failed</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Recent Sync History
        </CardTitle>
        <CardDescription>
          Last 20 synchronization operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rates</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(entry.timestamp), 'MMM dd, HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {entry.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(entry.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {entry.ratesProcessed.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {(entry.duration / 1000).toFixed(1)}s
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {entry.status === 'failure' && (
                          <DropdownMenuItem>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

### 7. Admin Layout (`src/components/layouts/admin-layout.tsx`)

#### Layout Component
```typescript
export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/home" className="text-2xl font-bold hover:opacity-80">
                Joot
              </Link>
              <Badge variant="secondary">Admin Dashboard</Badge>
            </div>
            
            <nav className="flex items-center gap-6">
              <Link 
                href="/admin/exchange-rates" 
                className="text-sm hover:underline flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Exchange Rates
              </Link>
              <Link 
                href="/admin/users" 
                className="text-sm hover:underline flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Users
              </Link>
              <Link 
                href="/admin/logs" 
                className="text-sm hover:underline flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Logs
              </Link>
              
              <div className="h-4 w-px bg-border" />
              
              <Button variant="outline" size="sm" asChild>
                <Link href="/home">
                  <Home className="h-4 w-4 mr-2" />
                  Back to App
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

### 8. API Endpoints

#### Trigger Sync Endpoint (`src/pages/api/admin/trigger-sync.ts`)
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Admin authentication check
  if (!await isAdminUser(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { type, date, startDate, endDate } = req.body;
  
  try {
    let result;
    
    switch (type) {
      case 'fiat':
        const ecbService = new DailySyncService();
        result = await ecbService.syncFiatCurrencies(date);
        break;
        
      case 'crypto':
        const cryptoService = new CryptoRateService();
        result = await cryptoService.syncBitcoinRates(date);
        break;
        
      case 'both':
        const dailySyncService = new DailySyncService();
        result = await dailySyncService.executeDailySync(date);
        break;
        
      case 'backfill':
        const backfillService = new BackfillService();
        result = await backfillService.executeBackfill({ 
          startDate: startDate || '2015-01-01', 
          endDate: endDate || new Date().toISOString().split('T')[0],
          batchSize: 500,
          skipExisting: true,
          dryRun: false
        });
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid sync type' });
    }
    
    res.status(200).json({
      success: true,
      message: `${type} sync completed successfully`,
      data: result
    });
    
  } catch (error) {
    console.error(`Admin sync failed (${type}):`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

#### System Health Endpoint (`src/pages/api/admin/system-health.ts`)
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const monitoringService = new MonitoringService();
    const health = await monitoringService.getSystemHealth();
    
    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 9. Navigation Integration

#### UserMenu Component Update
**Update `src/components/page-specific/user-menu.tsx`:**

```typescript
// Add to UserMenu component props
interface UserMenuProps {
  children: React.ReactNode
  userName?: string
  isAdmin?: boolean  // Add this line
}

// Add admin menu item before logout
{isAdmin && (
  <>
    <DropdownMenuSeparator className="bg-border" />
    <Link href="/admin/exchange-rates">
      <DropdownMenuItem className="px-spacing-2 py-spacing-1_5 text-sm/normal text-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground">
        <Settings className="mr-spacing-2 h-4 w-4" />
        Admin Dashboard
      </DropdownMenuItem>
    </Link>
  </>
)}
```

#### Home Page Update
**Update `src/app/home/page.tsx`:**

```typescript
// Add admin check
const isAdminUser = await checkAdminPermissions(user.id);

// Pass to UserMenu
<UserMenu userName={fullName} isAdmin={isAdminUser}>
  <Avatar className="size-10 cursor-pointer hover:opacity-80 transition-opacity">
    <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
      {userInitials}
    </AvatarFallback>
  </Avatar>
</UserMenu>
```

## Success Criteria
- [ ] Admin dashboard accessible from user menu (admin users only)
- [ ] Real-time system health monitoring displays current status
- [ ] Data quality metrics show comprehensive overview
- [ ] Manual sync controls work for all currency types
- [ ] Exchange rate explorer allows interactive lookup
- [ ] Sync history table shows recent operations
- [ ] Proper authentication and authorization implemented
- [ ] Responsive design works on mobile and desktop
- [ ] Error handling provides clear user feedback
- [ ] All components use semantic design tokens

## Testing Strategy
1. **Authentication Tests**: Verify admin-only access
2. **Component Tests**: Test all dashboard components
3. **Integration Tests**: Test API endpoints and data flow
4. **E2E Tests**: Complete admin workflow testing
5. **Performance Tests**: Dashboard load times and responsiveness

## Security Considerations
- Admin routes protected with server-side authentication
- API endpoints require admin authorization headers
- Sensitive operations logged for audit trail
- Rate limiting on admin endpoints to prevent abuse
- Input validation on all sync parameters

## Deployment Notes
- Set admin user permissions in database/environment
- Configure proper RBAC (Role-Based Access Control)
- Monitor dashboard performance in production
- Set up alerts for system health degradation
- Test admin functionality in staging environment first