import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isAdminAvailable } from '@/lib/supabase/admin';
// import { currencyConfigService } from '@/lib/services/currency-config-service';

// GET: Fetch all currencies and their tracking status
export async function GET(request: NextRequest) {
  // Check if admin operations are available
  if (!isAdminAvailable()) {
    return NextResponse.json(
      { error: 'Admin operations not available in this environment' },
      { status: 503 }
    );
  }

  const supabase = createAdminClient()!;
  
  try {
    // For now, return the supported currencies from the enum
    // This table may not exist yet in the database schema
    const supportedCurrencies = [
      'USD', 'THB', 'EUR', 'GBP', 'SGD', 'VND', 'MYR', 'BTC'
    ].map(code => ({
      currency_code: code,
      is_crypto: code === 'BTC',
      is_enabled: true,
      created_at: new Date().toISOString()
    }));

    // Try to fetch from currency_configuration table if it exists
    // If it fails, fall back to the enum-based list
    let data = supportedCurrencies;
    try {
      const result = await supabase
        .from('currency_configuration' as any)
        .select('*')
        .order('is_crypto', { ascending: true })
        .order('currency_code', { ascending: true });
      
      if (result.data && !result.error && Array.isArray(result.data)) {
        data = result.data as any[];
      }
    } catch (tableError) {
      console.warn('currency_configuration table not found, using fallback currency list');
    }

    return NextResponse.json({ currencies: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST: Update tracked currencies
export async function POST(request: NextRequest) {
  // Check if admin operations are available
  if (!isAdminAvailable()) {
    return NextResponse.json(
      { error: 'Admin operations not available in this environment' },
      { status: 503 }
    );
  }

  const supabase = createAdminClient()!;
  
  try {
    const { trackedCurrencies } = await request.json();

    if (!Array.isArray(trackedCurrencies)) {
      return NextResponse.json(
        { error: 'Invalid request: trackedCurrencies must be an array' },
        { status: 400 }
      );
    }

    // Ensure EUR is always included (needed for ECB calculations)
    if (!trackedCurrencies.includes('EUR')) {
      trackedCurrencies.push('EUR');
    }

    // TODO: Implement database function when currency_configuration table exists
    // const { data, error } = await supabase
    //   .rpc('update_tracked_currencies', {
    //     p_currencies: trackedCurrencies
    //   });

    console.warn('Currency tracking update not implemented - requires currency_configuration table');

    // Clear the currency configuration cache to force refresh
    // currencyConfigService.clearCache();

    return NextResponse.json({
      success: true,
      message: 'Currency configuration update not yet implemented',
      removedRates: 0,
      trackedCurrencies: trackedCurrencies
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE: Remove all rates for specific currencies
export async function DELETE(request: NextRequest) {
  // Check if admin operations are available
  if (!isAdminAvailable()) {
    return NextResponse.json(
      { error: 'Admin operations not available in this environment' },
      { status: 503 }
    );
  }

  const supabase = createAdminClient()!;
  
  try {
    const { currencies } = await request.json();

    if (!Array.isArray(currencies) || currencies.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: currencies must be a non-empty array' },
        { status: 400 }
      );
    }

    // Delete exchange rates for specified currencies
    const { data, error } = await supabase
      .from('exchange_rates')
      .delete()
      .or(
        currencies
          .map(c => `from_currency.eq.${c},to_currency.eq.${c}`)
          .join(',')
      );

    if (error) {
      console.error('Error deleting exchange rates:', error);
      return NextResponse.json(
        { error: 'Failed to delete exchange rates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deleted rates for currencies: ${currencies.join(', ')}`
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}