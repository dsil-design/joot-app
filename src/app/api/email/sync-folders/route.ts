/**
 * Multi-Folder Sync API
 *
 * POST /api/email/sync-folders - Sync emails from multiple folders
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { syncMultipleFolders } from '@/lib/services/multi-folder-sync-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/email/sync-folders
 *
 * Sync emails from multiple folders
 *
 * Request body:
 * - emailAccountId: string
 * - userId: string
 * - folders?: string[] (optional, uses account.monitored_folders if not provided)
 * - syncType?: 'full' | 'incremental' (default: incremental)
 * - limit?: number (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailAccountId, userId, folders, syncType, limit } = body;

    if (!emailAccountId || !userId) {
      return NextResponse.json(
        { error: 'emailAccountId and userId are required' },
        { status: 400 }
      );
    }

    console.log(`📂 Starting multi-folder sync for account ${emailAccountId}`);

    const result = await syncMultipleFolders({
      emailAccountId,
      userId,
      folders,
      syncType: syncType || 'incremental',
      limit,
      supabaseClient: supabase,
      onProgress: (folder, current, total) => {
        console.log(`📧 Progress: ${current}/${total} - ${folder}`);
      },
    });

    if (result.success) {
      console.log(`✅ Multi-folder sync completed: ${result.totalEmailsIndexed} indexed, ${result.totalReceiptsDetected} receipts`);
    } else {
      console.error(`❌ Multi-folder sync failed with ${result.errors.length} errors`);
    }

    return NextResponse.json({
      success: result.success,
      summary: {
        totalEmailsIndexed: result.totalEmailsIndexed,
        totalEmailsSkipped: result.totalEmailsSkipped,
        totalReceiptsDetected: result.totalReceiptsDetected,
      },
      folderResults: result.folderResults,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Multi-folder sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
