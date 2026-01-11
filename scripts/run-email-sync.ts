import { ImapFlow } from 'imapflow';
import { createServiceRoleClient } from '../src/lib/supabase/server';

interface EmailInsertData {
  user_id: string;
  message_id: string;
  uid: number;
  folder: string;
  subject: string | null;
  from_address: string | null;
  from_name: string | null;
  date: string | null;
  seen: boolean;
  has_attachments: boolean;
}

async function main() {
  console.log('=== iCloud Email Sync ===\n');

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
  console.log(`Syncing emails for user: ${user.email} (${user.id})\n`);

  // Get current sync stats
  const { data: syncState } = await supabase
    .from('email_sync_state')
    .select('last_uid, last_sync_at')
    .eq('user_id', user.id)
    .eq('folder', process.env.ICLOUD_FOLDER)
    .single();

  const { count: emailCount } = await supabase
    .from('emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  console.log('Current stats:');
  console.log(`  Emails in DB: ${emailCount}`);
  console.log(`  Last synced UID: ${syncState?.last_uid || 0}`);
  console.log(`  Last sync: ${syncState?.last_sync_at || 'Never'}\n`);

  // Connect to iCloud
  const folder = process.env.ICLOUD_FOLDER || 'Transactions';
  console.log(`Connecting to iCloud IMAP...`);

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
    console.log('Connected!\n');

    // Open mailbox
    const mailbox = await client.mailboxOpen(folder);
    console.log(`Mailbox: ${folder}`);
    console.log(`  Total messages: ${mailbox.exists}`);
    console.log(`  UID validity: ${mailbox.uidValidity}`);
    console.log(`  UID next: ${mailbox.uidNext}\n`);

    const lastUid = syncState?.last_uid || 0;

    // Search for messages we don't have yet
    // Use SEARCH instead of FETCH range to avoid errors with non-existent UIDs
    let uidsToFetch: number[] = [];

    if (lastUid > 0) {
      // Search for UIDs greater than our last synced UID
      console.log(`Searching for UIDs > ${lastUid}...`);
      const searchResult = await client.search({ uid: `${lastUid + 1}:*` }, { uid: true });
      // Filter out any UIDs <= lastUid (edge case with IMAP * semantics)
      uidsToFetch = searchResult.filter(uid => uid > lastUid);
    } else {
      // Initial sync - get last 500 messages by sequence number
      console.log('Initial sync - fetching recent 500 messages...');
      const startSeq = Math.max(1, mailbox.exists - 499);
      const searchResult = await client.search({ seq: `${startSeq}:*` }, { uid: true });
      uidsToFetch = searchResult;
    }

    console.log(`Found ${uidsToFetch.length} new messages to sync\n`);

    if (uidsToFetch.length === 0) {
      console.log('No new emails to sync!');
      await client.logout();
      return;
    }

    // Fetch in batches
    const batchSize = 100;
    const emails: EmailInsertData[] = [];
    let maxUid = lastUid;
    let errors = 0;

    for (let i = 0; i < uidsToFetch.length; i += batchSize) {
      const batch = uidsToFetch.slice(i, i + batchSize);
      const uidRange = batch.join(',');

      console.log(`Fetching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uidsToFetch.length / batchSize)} (${batch.length} messages)...`);

      for await (const message of client.fetch(uidRange, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
      }, { uid: true })) {
        try {
          const envelope = message.envelope;
          if (!envelope) {
            console.warn(`  No envelope for UID ${message.uid}`);
            continue;
          }

          const fromAddress = envelope.from?.[0];

          emails.push({
            user_id: user.id,
            message_id: envelope.messageId || `uid-${message.uid}`,
            uid: message.uid,
            folder,
            subject: envelope.subject || null,
            from_address: fromAddress?.address || null,
            from_name: fromAddress?.name || null,
            date: envelope.date?.toISOString() || null,
            seen: message.flags?.has('\\Seen') || false,
            has_attachments: hasAttachments(message.bodyStructure),
          });

          maxUid = Math.max(maxUid, message.uid);
        } catch (parseError) {
          console.error(`  Error parsing UID ${message.uid}:`, parseError);
          errors++;
        }
      }
    }

    console.log(`\nFetched ${emails.length} emails (${errors} errors)`);

    // Insert in batches
    if (emails.length > 0) {
      console.log('Inserting into database...');

      const insertBatchSize = 500;
      let inserted = 0;

      for (let i = 0; i < emails.length; i += insertBatchSize) {
        const batch = emails.slice(i, i + insertBatchSize);

        const { data, error } = await supabase
          .from('emails')
          .upsert(batch, {
            onConflict: 'user_id,message_id',
            ignoreDuplicates: true,
          })
          .select('id');

        if (error) {
          console.error(`Error inserting batch:`, error);
        } else {
          inserted += data?.length || 0;
        }
      }

      console.log(`Inserted ${inserted} emails`);

      // Update sync state
      const { error: updateError } = await supabase
        .from('email_sync_state')
        .upsert({
          user_id: user.id,
          folder,
          last_uid: maxUid,
          last_sync_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,folder',
        });

      if (updateError) {
        console.error('Error updating sync state:', updateError);
      } else {
        console.log(`Updated last_uid to ${maxUid}`);
      }
    }

    // Final stats
    const { count: finalCount } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    console.log('\n=== Sync Complete ===');
    console.log(`Total emails in DB: ${finalCount}`);

    await client.logout();
    console.log('Disconnected from IMAP');

  } catch (error) {
    console.error('Sync error:', error);
    try {
      await client.logout();
    } catch { /* ignore */ }
    process.exit(1);
  }
}

function hasAttachments(bodyStructure: unknown): boolean {
  if (!bodyStructure || typeof bodyStructure !== 'object') {
    return false;
  }

  const structure = bodyStructure as Record<string, unknown>;

  if (structure.type === 'multipart') {
    const childNodes = structure.childNodes as unknown[];
    if (Array.isArray(childNodes)) {
      return childNodes.some((child) => {
        const childObj = child as Record<string, unknown>;
        return childObj.disposition === 'attachment' || hasAttachments(child);
      });
    }
  }

  return structure.disposition === 'attachment';
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
