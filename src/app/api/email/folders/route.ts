/**
 * Email Folders API
 *
 * GET /api/email/folders - List all folders from an IMAP account
 * POST /api/email/folders - Update monitored folders for an account
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { IMAPConnection, createIMAPConfig, type EmailAccount } from '@/lib/services/imap-connection';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/email/folders?emailAccountId=xxx&userId=yyy
 *
 * List all available folders from the IMAP server
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emailAccountId = searchParams.get('emailAccountId');
    const userId = searchParams.get('userId');

    if (!emailAccountId || !userId) {
      return NextResponse.json(
        { error: 'emailAccountId and userId are required' },
        { status: 400 }
      );
    }

    console.log(`📂 Fetching folders for account ${emailAccountId}`);

    // Fetch email account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', emailAccountId)
      .eq('user_id', userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      );
    }

    // Connect to IMAP and list folders
    const config = createIMAPConfig(account as unknown as EmailAccount);
    const conn = new IMAPConnection(config);

    try {
      await conn.connect();

      // Get list of all folders
      const boxes = await conn.getBoxes();

      // Convert to a flat list of folder paths
      const folders = extractFolderPaths(boxes);

      await conn.disconnect();

      console.log(`✅ Found ${folders.length} folders`);

      return NextResponse.json({
        folders,
        currentlyMonitored: account.monitored_folders || ['INBOX'],
      });
    } catch (error) {
      await conn.disconnect();
      throw error;
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch folders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/email/folders
 *
 * Update the monitored folders for an email account
 *
 * Request body:
 * - emailAccountId: string
 * - userId: string
 * - folders: string[] - Array of folder names to monitor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailAccountId, userId, folders } = body;

    if (!emailAccountId || !userId || !folders || !Array.isArray(folders)) {
      return NextResponse.json(
        { error: 'emailAccountId, userId, and folders array are required' },
        { status: 400 }
      );
    }

    console.log(`📂 Updating monitored folders for account ${emailAccountId}`);
    console.log('Folders:', folders);

    // Update email account
    const { error: updateError } = await supabase
      .from('email_accounts')
      .update({
        monitored_folders: folders,
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailAccountId)
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Failed to update folders: ${updateError.message}`);
    }

    console.log('✅ Folders updated successfully');

    return NextResponse.json({
      message: 'Monitored folders updated',
      folders,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update folders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Extract folder paths from IMAP box tree
 */
function extractFolderPaths(boxes: any, prefix = ''): Array<{
  name: string;
  path: string;
  hasChildren: boolean;
  specialUse?: string;
}> {
  const folders: Array<{
    name: string;
    path: string;
    hasChildren: boolean;
    specialUse?: string;
  }> = [];

  for (const [name, box] of Object.entries(boxes as Record<string, any>)) {
    const path = prefix ? `${prefix}${box.delimiter}${name}` : name;

    folders.push({
      name,
      path,
      hasChildren: box.children && Object.keys(box.children).length > 0,
      specialUse: box.special_use,
    });

    // Recursively process children
    if (box.children) {
      const childFolders = extractFolderPaths(box.children, path);
      folders.push(...childFolders);
    }
  }

  return folders;
}
