import { NextRequest, NextResponse } from 'next/server';
import { ecbFullSyncService } from '@/lib/services/ecb-full-sync-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { syncType = 'manual' } = body;

    // Check if sync is already running (fallback for when sync tables don't exist yet)
    try {
      const { data: latestSync } = await supabase
        .rpc('get_latest_sync_status' as any);

      if (latestSync?.[0]?.status === 'running') {
        return NextResponse.json(
          { error: 'Sync already in progress' }, 
          { status: 409 }
        );
      }
    } catch (error) {
      // Sync tables don't exist yet, proceed with sync
      console.log('Sync tables not available yet, proceeding...');
    }

    // Start sync in background (don't await)
    ecbFullSyncService.executeSync(syncType, user.id)
      .catch(error => {
        console.error('Background sync failed:', error);
      });

    return NextResponse.json({
      success: true,
      message: 'Sync started successfully'
    });

  } catch (error) {
    console.error('Sync trigger failed:', error);
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}