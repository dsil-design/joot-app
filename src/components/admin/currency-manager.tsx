'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, RefreshCw, AlertCircle, Check, Globe, Bitcoin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Currency {
  id: string;
  currency_code: string;
  display_name: string;
  currency_symbol: string;
  source: string;
  is_crypto: boolean;
  is_tracked: boolean;
  decimal_places: number;
}

export function CurrencyManager() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [stats, setStats] = useState({ total: 0, tracked: 0, fiat: 0, crypto: 0 });

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/currencies');
      
      if (!response.ok) {
        throw new Error('Failed to fetch currencies');
      }

      const data = await response.json();
      setCurrencies(data.currencies || []);
      
      // Set initially selected currencies
      const tracked = new Set<string>();
      let fiatCount = 0;
      let cryptoCount = 0;
      
      data.currencies?.forEach((currency: Currency) => {
        if (currency.is_tracked) {
          tracked.add(currency.currency_code);
          if (currency.is_crypto) {
            cryptoCount++;
          } else {
            fiatCount++;
          }
        }
      });
      
      setSelectedCurrencies(tracked);
      setStats({
        total: data.currencies?.length || 0,
        tracked: tracked.size,
        fiat: fiatCount,
        crypto: cryptoCount
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      setMessage({ type: 'error', text: 'Failed to load currency configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyToggle = (currencyCode: string) => {
    const newSelected = new Set(selectedCurrencies);
    
    if (newSelected.has(currencyCode)) {
      // Don't allow removing EUR as it's required for calculations
      if (currencyCode === 'EUR') {
        setMessage({ type: 'error', text: 'EUR is required for exchange rate calculations and cannot be disabled' });
        return;
      }
      newSelected.delete(currencyCode);
    } else {
      newSelected.add(currencyCode);
    }
    
    setSelectedCurrencies(newSelected);
    setHasChanges(true);
    setMessage(null);
    
    // Update stats preview
    let fiatCount = 0;
    let cryptoCount = 0;
    currencies.forEach(currency => {
      if (newSelected.has(currency.currency_code)) {
        if (currency.is_crypto) {
          cryptoCount++;
        } else {
          fiatCount++;
        }
      }
    });
    
    setStats(prev => ({
      ...prev,
      tracked: newSelected.size,
      fiat: fiatCount,
      crypto: cryptoCount
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/admin/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackedCurrencies: Array.from(selectedCurrencies)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update currency configuration');
      }

      setMessage({ 
        type: 'success', 
        text: `${data.message}${data.removedRates > 0 ? ` (${data.removedRates} old rates removed)` : ''}` 
      });
      
      // Update the tracked status in local state
      setCurrencies(prev => prev.map(currency => ({
        ...currency,
        is_tracked: selectedCurrencies.has(currency.currency_code)
      })));
      
      setHasChanges(false);

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setMessage(prev => prev?.type === 'success' ? null : prev);
      }, 5000);

    } catch (error) {
      console.error('Error saving configuration:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save configuration' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAll = (type: 'fiat' | 'crypto' | 'all') => {
    const newSelected = new Set(selectedCurrencies);
    
    currencies.forEach(currency => {
      if (type === 'all' || (type === 'fiat' && !currency.is_crypto) || (type === 'crypto' && currency.is_crypto)) {
        newSelected.add(currency.currency_code);
      }
    });
    
    setSelectedCurrencies(newSelected);
    setHasChanges(true);
    setMessage(null);
  };

  const handleDeselectAll = (type: 'fiat' | 'crypto' | 'all') => {
    const newSelected = new Set(selectedCurrencies);
    
    currencies.forEach(currency => {
      // Never remove EUR
      if (currency.currency_code === 'EUR') return;
      
      if (type === 'all' || (type === 'fiat' && !currency.is_crypto) || (type === 'crypto' && currency.is_crypto)) {
        newSelected.delete(currency.currency_code);
      }
    });
    
    setSelectedCurrencies(newSelected);
    setHasChanges(true);
    setMessage(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const fiatCurrencies = currencies.filter(c => !c.is_crypto);
  const cryptoCurrencies = currencies.filter(c => c.is_crypto);

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <Card>
        <CardHeader>
          <CardTitle>Currency Configuration</CardTitle>
          <CardDescription>
            Select which currencies to track and store exchange rates for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-4">
              <Badge variant="outline" className="py-1 px-3">
                Total: {stats.total}
              </Badge>
              <Badge variant="default" className="py-1 px-3">
                Tracked: {stats.tracked}
              </Badge>
              <Badge variant="secondary" className="py-1 px-3">
                <Globe className="h-3 w-3 mr-1" />
                Fiat: {stats.fiat}
              </Badge>
              <Badge variant="secondary" className="py-1 px-3">
                <Bitcoin className="h-3 w-3 mr-1" />
                Crypto: {stats.crypto}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCurrencies()}
                disabled={loading || saving}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button
                variant={hasChanges ? "default" : "outline"}
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>

          {message && (
            <Alert className={cn("mb-4", message.type === 'error' ? "border-red-500" : "border-green-500")}>
              {message.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {hasChanges && (
            <Alert className="mb-4 border-yellow-500">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have unsaved changes. Click "Save Changes" to apply them.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Fiat Currencies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Fiat Currencies (ECB)
              </CardTitle>
              <CardDescription>
                Exchange rates from European Central Bank
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleSelectAll('fiat')}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDeselectAll('fiat')}>
                Deselect All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fiatCurrencies.map(currency => (
              <div
                key={currency.id}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                  selectedCurrencies.has(currency.currency_code) 
                    ? "bg-primary/5 border-primary/20" 
                    : "hover:bg-muted/50"
                )}
              >
                <Checkbox
                  id={currency.currency_code}
                  checked={selectedCurrencies.has(currency.currency_code)}
                  onCheckedChange={() => handleCurrencyToggle(currency.currency_code)}
                  disabled={currency.currency_code === 'EUR'}
                />
                <label
                  htmlFor={currency.currency_code}
                  className="flex-1 cursor-pointer space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{currency.currency_code}</span>
                    <span className="text-muted-foreground">{currency.currency_symbol}</span>
                    {currency.currency_code === 'EUR' && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currency.display_name}
                  </div>
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Crypto Currencies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bitcoin className="h-5 w-5" />
                Cryptocurrencies (CoinGecko)
              </CardTitle>
              <CardDescription>
                Exchange rates from CoinGecko API
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleSelectAll('crypto')}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDeselectAll('crypto')}>
                Deselect All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cryptoCurrencies.map(currency => (
              <div
                key={currency.id}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                  selectedCurrencies.has(currency.currency_code) 
                    ? "bg-primary/5 border-primary/20" 
                    : "hover:bg-muted/50"
                )}
              >
                <Checkbox
                  id={currency.currency_code}
                  checked={selectedCurrencies.has(currency.currency_code)}
                  onCheckedChange={() => handleCurrencyToggle(currency.currency_code)}
                />
                <label
                  htmlFor={currency.currency_code}
                  className="flex-1 cursor-pointer space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{currency.currency_code}</span>
                    <span className="text-muted-foreground">{currency.currency_symbol}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currency.display_name}
                  </div>
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}