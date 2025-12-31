import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailSyncService } from '@/lib/services/email-sync-service';

/**
 * GET /api/emails
 *
 * Retrieves synced emails for the authenticated user.
 *
 * Query Parameters:
 * - folder: Filter by folder (optional)
 * - limit: Number of emails to return (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 * - search: Search in subject and from fields (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search');

    // Build query
    let query = supabase
      .from('emails')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply folder filter
    if (folder) {
      query = query.eq('folder', folder);
    }

    // Apply search filter
    if (search) {
      query = query.or(`subject.ilike.%${search}%,from_address.ilike.%${search}%,from_name.ilike.%${search}%`);
    }

    const { data: emails, error, count } = await query;

    if (error) {
      console.error('Error fetching emails:', error);
      return NextResponse.json(
        { error: 'Failed to fetch emails' },
        { status: 500 }
      );
    }

    // Get sync stats
    const stats = await emailSyncService.getSyncStats(user.id);

    return NextResponse.json({
      emails: emails || [],
      total: count || 0,
      limit,
      offset,
      stats: {
        totalEmails: stats.totalEmails,
        lastSyncAt: stats.lastSyncAt,
        folders: stats.folders,
      },
    });

  } catch (error) {
    console.error('Error in emails API:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
