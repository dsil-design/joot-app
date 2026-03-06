import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/ai-journal
 *
 * Paginated journal entries with optional filters.
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - from_address: filter by sender
 * - invocation_type: filter by type
 * - parser_key: filter by parser
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const fromAddress = searchParams.get('from_address');
    const invocationType = searchParams.get('invocation_type');
    const parserKey = searchParams.get('parser_key');

    const offset = (page - 1) * limit;

    let query = supabase
      .from('ai_journal')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fromAddress) query = query.eq('from_address', fromAddress);
    if (invocationType) query = query.eq('invocation_type', invocationType);
    if (parserKey) query = query.eq('final_parser_key', parserKey);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching journal entries:', error);
      return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 });
    }

    return NextResponse.json({
      entries: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error in ai-journal API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
