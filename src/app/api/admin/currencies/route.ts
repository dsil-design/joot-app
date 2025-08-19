import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import { currencyConfigService } from '@/lib/services/currency-config-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch all currencies and their tracking status
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('currency_configuration')
      .select('*')
      .order('is_crypto', { ascending: true })
      .order('currency_code', { ascending: true });

    if (error) {
      console.error('Error fetching currency configuration:', error);
      return NextResponse.json(
        { error: 'Failed to fetch currency configuration' },
        { status: 500 }
      );
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

    // Call the database function to update tracked currencies
    const { data, error } = await supabase
      .rpc('update_tracked_currencies', {
        p_currencies: trackedCurrencies
      });

    if (error) {
      console.error('Error updating tracked currencies:', error);
      return NextResponse.json(
        { error: 'Failed to update tracked currencies' },
        { status: 500 }
      );
    }

    // Fetch updated configuration
    const { data: updatedConfig, error: fetchError } = await supabase
      .from('currency_configuration')
      .select('*')
      .eq('is_tracked', true)
      .order('currency_code');

    if (fetchError) {
      console.error('Error fetching updated configuration:', fetchError);
    }

    // Clear the currency configuration cache to force refresh
    // currencyConfigService.clearCache();

    return NextResponse.json({
      success: true,
      message: data?.[0]?.message || 'Currency configuration updated successfully',
      removedRates: data?.[0]?.removed_rates || 0,
      trackedCurrencies: updatedConfig?.map(c => c.currency_code) || trackedCurrencies
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