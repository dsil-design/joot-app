/**
 * Multi-Folder Email Sync Service
 *
 * Syncs emails from multiple folders in a single operation.
 * Uses the monitored_folders setting from email_accounts table.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { syncEmails, type SyncOptions, type SyncResult } from './email-sync-service';

export interface MultiFolderSyncOptions {
  emailAccountId: string;
  userId: string;
  folders?: string[]; // Optional override, otherwise uses account.monitored_folders
  syncType?: 'full' | 'incremental';
  limit?: number;
  supabaseClient: SupabaseClient;
  onProgress?: (folder: string, progress: number, total: number) => void;
}

export interface MultiFolderSyncResult {
  success: boolean;
  totalEmailsIndexed: number;
  totalEmailsSkipped: number;
  totalReceiptsDetected: number;
  folderResults: Array<{
    folder: string;
    success: boolean;
    emailsIndexed: number;
    emailsSkipped: number;
    receiptsDetected: number;
    error?: string;
  }>;
  errors: string[];
}

/**
 * Sync emails from multiple folders
 *
 * Iterates through all monitored folders and syncs each one.
 * Continues even if individual folders fail.
 */
export async function syncMultipleFolders(
  options: MultiFolderSyncOptions
): Promise<MultiFolderSyncResult> {
  const {
    emailAccountId,
    userId,
    folders: overrideFolders,
    syncType = 'incremental',
    limit,
    supabaseClient,
    onProgress,
  } = options;

  const result: MultiFolderSyncResult = {
    success: true,
    totalEmailsIndexed: 0,
    totalEmailsSkipped: 0,
    totalReceiptsDetected: 0,
    folderResults: [],
    errors: [],
  };

  try {
    // Get monitored folders from account settings
    let foldersToSync: string[];

    if (overrideFolders && overrideFolders.length > 0) {
      foldersToSync = overrideFolders;
    } else {
      // Fetch from database
      const { data: account, error: accountError } = await supabaseClient
        .from('email_accounts')
        .select('monitored_folders')
        .eq('id', emailAccountId)
        .eq('user_id', userId)
        .single();

      if (accountError || !account) {
        throw new Error('Email account not found');
      }

      foldersToSync = account.monitored_folders || ['INBOX'];
    }

    console.log(`📂 Syncing ${foldersToSync.length} folders:`, foldersToSync);

    // Sync each folder
    for (let i = 0; i < foldersToSync.length; i++) {
      const folder = foldersToSync[i];

      console.log(`\n📧 [${i + 1}/${foldersToSync.length}] Syncing folder: ${folder}`);

      if (onProgress) {
        onProgress(folder, i + 1, foldersToSync.length);
      }

      try {
        const folderSyncOptions: SyncOptions = {
          emailAccountId,
          userId,
          folderName: folder,
          syncType,
          limit,
          supabaseClient,
        };

        const folderResult = await syncEmails(folderSyncOptions);

        result.folderResults.push({
          folder,
          success: folderResult.success,
          emailsIndexed: folderResult.emailsIndexed,
          emailsSkipped: folderResult.emailsSkipped,
          receiptsDetected: folderResult.receiptsDetected,
          error: folderResult.error,
        });

        if (folderResult.success) {
          result.totalEmailsIndexed += folderResult.emailsIndexed;
          result.totalEmailsSkipped += folderResult.emailsSkipped;
          result.totalReceiptsDetected += folderResult.receiptsDetected;

          console.log(`✅ Folder "${folder}" synced: ${folderResult.emailsIndexed} indexed, ${folderResult.receiptsDetected} receipts`);
        } else {
          result.errors.push(`Folder "${folder}": ${folderResult.error}`);
          console.error(`❌ Folder "${folder}" failed: ${folderResult.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Folder "${folder}": ${errorMessage}`);
        result.folderResults.push({
          folder,
          success: false,
          emailsIndexed: 0,
          emailsSkipped: 0,
          receiptsDetected: 0,
          error: errorMessage,
        });

        console.error(`❌ Folder "${folder}" error:`, error);
      }
    }

    // Overall success if at least one folder synced successfully
    result.success = result.folderResults.some(f => f.success);

    console.log('\n📊 Multi-folder sync complete:');
    console.log(`  Total indexed: ${result.totalEmailsIndexed}`);
    console.log(`  Total receipts: ${result.totalReceiptsDetected}`);
    console.log(`  Errors: ${result.errors.length}`);

    return result;
  } catch (error) {
    console.error('Multi-folder sync error:', error);
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

/**
 * Get folder sync statistics from database
 */
export async function getFolderSyncStats(
  emailAccountId: string,
  userId: string,
  supabaseClient: SupabaseClient
): Promise<Array<{
  folder: string;
  lastSyncAt: string | null;
  emailCount: number;
  receiptCount: number;
}>> {
  try {
    // Get sync jobs grouped by folder
    const { data: jobs, error } = await supabaseClient
      .from('email_sync_jobs')
      .select('folder_name, completed_at, emails_indexed, receipts_detected')
      .eq('email_account_id', emailAccountId)
      .eq('user_id', userId)
      .eq('job_status', 'completed')
      .order('completed_at', { ascending: false });

    if (error || !jobs) {
      return [];
    }

    // Group by folder and get latest stats
    const folderMap = new Map<string, {
      lastSyncAt: string;
      emailCount: number;
      receiptCount: number;
    }>();

    for (const job of jobs) {
      const folder = job.folder_name || 'INBOX';

      if (!folderMap.has(folder)) {
        folderMap.set(folder, {
          lastSyncAt: job.completed_at,
          emailCount: job.emails_indexed || 0,
          receiptCount: job.receipts_detected || 0,
        });
      }
    }

    return Array.from(folderMap.entries()).map(([folder, stats]) => ({
      folder,
      lastSyncAt: stats.lastSyncAt,
      emailCount: stats.emailCount,
      receiptCount: stats.receiptCount,
    }));
  } catch (error) {
    console.error('Error fetching folder stats:', error);
    return [];
  }
}
