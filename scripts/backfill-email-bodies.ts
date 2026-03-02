/**
 * Backfill email bodies from IMAP
 *
 * Fetches email bodies for all emails in the database that don't have
 * text_body/html_body populated yet. Resumable — re-running picks up
 * where it left off since it only queries rows where both are NULL.
 *
 * Convention: NULL = never fetched, '' = fetched but empty/unparseable
 *
 * Usage: npx tsx scripts/backfill-email-bodies.ts
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createServiceRoleClient } from '../src/lib/supabase/server';

const BATCH_SIZE = 50;       // UIDs to fetch from IMAP at a time
const DB_PAGE_SIZE = 200;    // Rows to query from DB at a time
const IMAP_DELAY_MS = 500;   // Delay between IMAP batches

async function main() {
  console.log('=== Email Body Backfill ===\n');

  const supabase = createServiceRoleClient();

  // Get user
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error('Error fetching user:', userError || 'No users found');
    process.exit(1);
  }

  const user = users[0];
  console.log(`User: ${user.email} (${user.id})`);

  // Get total count of emails missing bodies
  const { count: totalMissing } = await supabase
    .from('emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('text_body', null)
    .is('html_body', null);

  const { count: totalEmails } = await supabase
    .from('emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  console.log(`Total emails: ${totalEmails}`);
  console.log(`Missing bodies: ${totalMissing}`);

  if (!totalMissing || totalMissing === 0) {
    console.log('\nAll emails already have bodies. Nothing to do.');
    return;
  }

  console.log(`\nWill fetch ${totalMissing} email bodies from IMAP...\n`);

  // Get the folder (all emails should be in the same folder)
  const { data: folderData } = await supabase
    .from('emails')
    .select('folder')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  const folder = folderData?.folder || process.env.ICLOUD_FOLDER || 'Transactions';
  console.log(`Folder: ${folder}\n`);

  // Connect to IMAP
  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.ICLOUD_EMAIL!,
      pass: process.env.ICLOUD_APP_PASSWORD!,
    },
    logger: false,
  });

  try {
    await client.connect();
    console.log('Connected to IMAP\n');

    await client.mailboxOpen(folder);

    let totalProcessed = 0;
    let totalErrors = 0;
    let lastUid = 0;
    let batchNumber = 0;

    // Process in pages using cursor-based pagination
    while (true) {
      // Query emails missing bodies, paginated by uid cursor
      let query = supabase
        .from('emails')
        .select('id, uid')
        .eq('user_id', user.id)
        .is('text_body', null)
        .is('html_body', null)
        .order('uid', { ascending: true })
        .limit(DB_PAGE_SIZE);

      if (lastUid > 0) {
        query = query.gt('uid', lastUid);
      }

      const { data: emails, error: queryError } = await query;

      if (queryError) {
        console.error('Error querying emails:', queryError);
        break;
      }

      if (!emails || emails.length === 0) {
        break;
      }

      console.log(`DB page: ${emails.length} emails (UIDs ${emails[0].uid}-${emails[emails.length - 1].uid})`);

      // Process in IMAP batches
      for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        batchNumber++;
        const batch = emails.slice(i, i + BATCH_SIZE);
        const uids = batch.map(e => e.uid);

        console.log(`  Batch ${batchNumber}: fetching UIDs ${uids[0]}-${uids[uids.length - 1]} (${uids.length} emails)...`);

        // Build a map from uid -> db row id for updates
        const uidToId = new Map<number, string>();
        for (const email of batch) {
          uidToId.set(email.uid, email.id);
        }

        let batchErrors = 0;

        try {
          // Fetch sources from IMAP
          const uidRange = uids.join(',');
          const fetchedUids = new Set<number>();

          for await (const message of client.fetch(uidRange, {
            uid: true,
            source: true,
          }, { uid: true })) {
            try {
              fetchedUids.add(message.uid);
              const dbId = uidToId.get(message.uid);
              if (!dbId) continue;

              let text_body = '';
              let html_body = '';

              if (message.source) {
                try {
                  const parsed = await simpleParser(message.source);
                  text_body = parsed.text || '';
                  html_body = typeof parsed.html === 'string' ? parsed.html : '';
                } catch {
                  // Store empty strings for unparseable emails
                  console.warn(`    Warning: Could not parse UID ${message.uid}, storing empty bodies`);
                }
              }

              // Update the email row
              const { error: updateError } = await supabase
                .from('emails')
                .update({ text_body, html_body })
                .eq('id', dbId);

              if (updateError) {
                console.error(`    Error updating UID ${message.uid}:`, updateError.message);
                batchErrors++;
              }
            } catch (parseError) {
              console.error(`    Error processing UID ${message.uid}:`, parseError);
              batchErrors++;
            }
          }

          // Mark emails not found in IMAP with empty strings (they may have been deleted)
          for (const email of batch) {
            if (!fetchedUids.has(email.uid)) {
              await supabase
                .from('emails')
                .update({ text_body: '', html_body: '' })
                .eq('id', email.id);
            }
          }
        } catch (fetchError) {
          console.error(`    IMAP fetch error for batch:`, fetchError);
          batchErrors += batch.length;
        }

        totalProcessed += batch.length;
        totalErrors += batchErrors;

        const progress = totalMissing > 0
          ? ((totalProcessed / totalMissing) * 100).toFixed(1)
          : '100.0';
        console.log(`  Progress: ${totalProcessed}/${totalMissing} (${progress}%) | Errors: ${totalErrors}`);

        // Rate limit between IMAP batches
        if (i + BATCH_SIZE < emails.length) {
          await new Promise(resolve => setTimeout(resolve, IMAP_DELAY_MS));
        }
      }

      // Update cursor for next page
      lastUid = emails[emails.length - 1].uid;

      // Delay between DB pages
      await new Promise(resolve => setTimeout(resolve, IMAP_DELAY_MS));
    }

    console.log('\n=== Backfill Complete ===');
    console.log(`Processed: ${totalProcessed}`);
    console.log(`Errors: ${totalErrors}`);

    // Verify
    const { count: remaining } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('text_body', null)
      .is('html_body', null);

    console.log(`Remaining without bodies: ${remaining}`);

    await client.logout();
    console.log('Disconnected from IMAP');

  } catch (error) {
    console.error('Fatal error:', error);
    try {
      await client.logout();
    } catch { /* ignore */ }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
