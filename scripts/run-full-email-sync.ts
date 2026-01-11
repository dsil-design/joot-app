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
  console.log('=== Full iCloud Email Sync ===\n');
  console.log('This will sync ALL emails from the folder, not just new ones.\n');

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
  console.log(`User: ${user.email} (${user.id})\n`);

  // Get current stats
  const { count: emailCount } = await supabase
    .from('emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Get min UID we have
  const { data: minUidRow } = await supabase
    .from('emails')
    .select('uid')
    .eq('user_id', user.id)
    .order('uid', { ascending: true })
    .limit(1)
    .single();

  const minUidInDb = minUidRow?.uid || Infinity;

  console.log('Current stats:');
  console.log(`  Emails in DB: ${emailCount}`);
  console.log(`  Minimum UID in DB: ${minUidInDb}`);

  // Connect to iCloud
  const folder = process.env.ICLOUD_FOLDER || 'Transactions';
  console.log(`\nConnecting to iCloud IMAP...`);

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

    // Search for all UIDs less than our minimum
    console.log(`\nSearching for UIDs < ${minUidInDb} (older emails we're missing)...`);

    let uidsToFetch: number[] = [];

    if (minUidInDb > 1) {
      const searchResult = await client.search({ uid: `1:${minUidInDb - 1}` }, { uid: true });
      uidsToFetch = searchResult;
    }

    console.log(`Found ${uidsToFetch.length} older messages to sync\n`);

    if (uidsToFetch.length === 0) {
      console.log('No older emails to sync - you have all emails!');
      await client.logout();
      return;
    }

    // Fetch in batches
    const batchSize = 100;
    const emails: EmailInsertData[] = [];
    let errors = 0;

    // Sort UIDs ascending so we process oldest first
    uidsToFetch.sort((a, b) => a - b);

    for (let i = 0; i < uidsToFetch.length; i += batchSize) {
      const batch = uidsToFetch.slice(i, i + batchSize);
      const uidRange = batch.join(',');

      console.log(`Fetching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uidsToFetch.length / batchSize)} (UIDs ${batch[0]}-${batch[batch.length - 1]}, ${batch.length} messages)...`);

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

        console.log(`  Inserting batch ${Math.floor(i / insertBatchSize) + 1}/${Math.ceil(emails.length / insertBatchSize)}...`);

        const { data, error } = await supabase
          .from('emails')
          .upsert(batch, {
            onConflict: 'user_id,message_id',
            ignoreDuplicates: true,
          })
          .select('id');

        if (error) {
          console.error(`  Error inserting batch:`, error);
        } else {
          inserted += data?.length || 0;
        }
      }

      console.log(`Inserted ${inserted} new emails`);
    }

    // Final stats
    const { count: finalCount } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get new min UID
    const { data: newMinRow } = await supabase
      .from('emails')
      .select('uid, date, subject')
      .eq('user_id', user.id)
      .order('uid', { ascending: true })
      .limit(1)
      .single();

    console.log('\n=== Sync Complete ===');
    console.log(`Total emails in DB: ${finalCount}`);
    console.log(`Oldest email UID: ${newMinRow?.uid}`);
    console.log(`Oldest email date: ${newMinRow?.date}`);
    console.log(`Oldest email subject: ${newMinRow?.subject}`);

    await client.logout();
    console.log('\nDisconnected from IMAP');

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
