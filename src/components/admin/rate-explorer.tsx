'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useExchangeRate, formatRelativeTime } from '@/lib/hooks/use-admin-data';
import { CurrencyType } from '@/lib/supabase/types';
import { 
  Search, 
  Loader2,
  ArrowLeftRight,
  Calendar,
  Clock,
  Info,
  TrendingUp,
  Eye
} from 'lucide-react';

const CURRENCIES: CurrencyType[] = ['USD', 'THB', 'EUR', 'GBP', 'SGD', 'VND', 'MYR', 'BTC'];

export function RateExplorer() {
  const [fromCurrency, setFromCurrency] = useState<CurrencyType>('USD');
  const [toCurrency, setToCurrency] = useState<CurrencyType>('THB');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const { data: rate, isLoading, error } = useExchangeRate(fromCurrency, toCurrency, selectedDate);
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };
  
  const formatRate = (rateValue: number, from: string, to: string) => {
    // Use more decimal places for small values (like when converting to BTC)
    if (to === 'BTC' || rateValue < 0.01) {
      return rateValue.toLocaleString(undefined, { 
        minimumFractionDigits: 8,
        maximumFractionDigits: 8 
      });
    }
    
    // Use fewer decimals for large values (like VND)
    if (to === 'VND') {
      return rateValue.toLocaleString(undefined, { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 2 
      });
    }
    
    // Standard precision for most currency pairs
    return rateValue.toLocaleString(undefined, { 
      minimumFractionDigits: 4,
      maximumFractionDigits: 6 
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-spacing-2">
          <Search className="h-5 w-5" />
          Exchange Rate Explorer
        </CardTitle>
        <CardDescription>
          Look up historical and current exchange rates for any supported currency pair
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-spacing-4">
        {/* Currency and Date Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-spacing-4">
          <div className="space-y-spacing-2">
            <Label>From Currency</Label>
            <Select value={fromCurrency} onValueChange={(value) => setFromCurrency(value as CurrencyType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                    {currency === 'BTC' && ' (Bitcoin)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-spacing-2">
            <Label>To Currency</Label>
            <Select value={toCurrency} onValueChange={(value) => setToCurrency(value as CurrencyType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                    {currency === 'BTC' && ' (Bitcoin)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-spacing-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
            />
          </div>
          
          <div className="space-y-spacing-2">
            <Label>Exchange Rate</Label>
            <div className="flex items-center h-10 px-spacing-3 border rounded-md bg-muted min-w-0">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : error ? (
                <span className="text-red-500 text-sm">No data</span>
              ) : rate ? (
                <span className="font-mono text-sm truncate">
                  {formatRate(rate.rate, fromCurrency, toCurrency)}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">No data</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Rate Display and Details */}
        {rate && !isLoading && (
          <div className="space-y-spacing-4">
            {/* Main Rate Display */}
            <div className="p-spacing-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-spacing-1">
                  {fromCurrency} → {toCurrency}
                </div>
                <div className="text-3xl font-bold font-mono">
                  {formatRate(rate.rate, fromCurrency, toCurrency)}
                </div>
                <div className="text-sm text-muted-foreground mt-spacing-1">
                  1 {fromCurrency} = {formatRate(rate.rate, fromCurrency, toCurrency)} {toCurrency}
                </div>
                {rate.rate !== 0 && (
                  <div className="text-xs text-muted-foreground mt-spacing-1">
                    1 {toCurrency} = {formatRate(1/rate.rate, toCurrency, fromCurrency)} {fromCurrency}
                  </div>
                )}
              </div>
            </div>
            
            {/* Rate Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-spacing-4 p-spacing-4 border rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Source</div>
                <div className="font-medium flex items-center gap-spacing-1">
                  <div className={`w-2 h-2 rounded-full ${
                    rate.source === 'ECB' ? 'bg-blue-500' : 
                    rate.source === 'COINGECKO' ? 'bg-orange-500' : 'bg-gray-500'
                  }`} />
                  {rate.source}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="font-medium">{rate.date}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Type</div>
                <Badge variant={rate.is_interpolated ? "secondary" : "default"} className="text-xs">
                  {rate.is_interpolated ? 'Interpolated' : 'Actual'}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Updated</div>
                <div className="font-medium text-sm">
                  {formatRelativeTime(rate.created_at || rate.date + 'T00:00:00Z')}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Interpolated Rate Warning */}
        {rate?.is_interpolated && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Interpolated Rate</AlertTitle>
            <AlertDescription>
              This rate was calculated from nearby dates because no actual data was available 
              for {selectedDate}. This typically happens on weekends, holidays, or during data outages.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Error State */}
        {error && !isLoading && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No Data Available</AlertTitle>
            <AlertDescription>
              No exchange rate data is available for {fromCurrency}/{toCurrency} on {selectedDate}. 
              This might be because:
              <ul className="list-disc list-inside mt-spacing-2 space-y-spacing-1">
                <li>The date is before our data coverage began</li>
                <li>The currency pair is not supported</li>
                <li>The date falls on a non-business day for fiat currencies</li>
                <li>There was a data synchronization issue</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-spacing-2">
          <Button
            variant="outline"
            size="sm"
            onClick={swapCurrencies}
            disabled={isLoading}
          >
            <ArrowLeftRight className="h-4 w-4 mr-spacing-2" />
            Swap Currencies
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(today)}
            disabled={isLoading}
          >
            <Calendar className="h-4 w-4 mr-spacing-2" />
            Today
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(yesterdayStr)}
            disabled={isLoading}
          >
            <Clock className="h-4 w-4 mr-spacing-2" />
            Yesterday
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const lastWeek = new Date();
              lastWeek.setDate(lastWeek.getDate() - 7);
              setSelectedDate(lastWeek.toISOString().split('T')[0]);
            }}
            disabled={isLoading}
          >
            <Calendar className="h-4 w-4 mr-spacing-2" />
            1 Week Ago
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const lastMonth = new Date();
              lastMonth.setMonth(lastMonth.getMonth() - 1);
              setSelectedDate(lastMonth.toISOString().split('T')[0]);
            }}
            disabled={isLoading}
          >
            <Calendar className="h-4 w-4 mr-spacing-2" />
            1 Month Ago
          </Button>
        </div>
        
        {/* Popular Currency Pairs */}
        <div className="pt-spacing-4 border-t">
          <div className="text-sm font-medium mb-spacing-2">Popular Pairs</div>
          <div className="flex flex-wrap gap-spacing-2">
            {[
              ['USD', 'THB'], 
              ['EUR', 'USD'], 
              ['GBP', 'USD'], 
              ['USD', 'SGD'],
              ['BTC', 'USD'],
              ['USD', 'VND'],
              ['EUR', 'THB']
            ].map(([from, to]) => (
              <Button
                key={`${from}-${to}`}
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setFromCurrency(from as CurrencyType);
                  setToCurrency(to as CurrencyType);
                }}
                disabled={isLoading}
              >
                <TrendingUp className="h-3 w-3 mr-spacing-1" />
                {from}/{to}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Information Footer */}
        <div className="text-xs text-muted-foreground pt-spacing-4 border-t">
          <p className="mb-spacing-1">
            <strong>Data Coverage:</strong> Fiat currencies from ECB (business days only), 
            Bitcoin from CoinGecko (daily including weekends).
          </p>
          <p>
            <strong>Precision:</strong> Rates are stored with high precision. 
            Display precision varies by currency pair.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}