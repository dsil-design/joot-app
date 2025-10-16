import { NextRequest, NextResponse } from 'next/server';
import { onDemandRateFetcher } from '@/lib/services/on-demand-rate-fetcher';
import { CurrencyType } from '@/lib/supabase/types';

/**
 * On-Demand Rate Fetching API
 * Fetches missing exchange rates from ECB when needed
 * Called by client components when a rate is missing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, fromCurrency, toCurrency } = body;

    if (!date || !fromCurrency || !toCurrency) {
      return NextResponse.json(
        { error: 'Missing required fields: date, fromCurrency, toCurrency' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    console.log(`📡 On-demand fetch request: ${fromCurrency}/${toCurrency} for ${date}`);

    const result = await onDemandRateFetcher.fetchRatesForDate(
      date,
      fromCurrency as CurrencyType,
      toCurrency as CurrencyType
    );

    return NextResponse.json({
      success: result.success,
      date: result.date,
      ratesInserted: result.ratesInserted,
      cacheHit: result.cacheHit,
      error: result.error,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('On-demand fetch API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
