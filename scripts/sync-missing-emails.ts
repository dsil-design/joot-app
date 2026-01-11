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

// Remove null characters and other problematic Unicode
function sanitizeText(text: string | null): string | null {
  if (!text) return null;
  // Remove null characters and other control characters (except newline, tab, etc.)
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

async function main() {
  console.log('=== Sync Missing Emails ===\n');

  const supabase = createServiceRoleClient();

  // Get user
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);

  const user = users![0];
  console.log(`User: ${user.email}\n`);

  // Get all UIDs from database
  console.log('Fetching UIDs from database...');
  const allDbEmails: number[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data } = await supabase
      .from('emails')
      .select('uid')
      .eq('user_id', user.id)
      .order('uid', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (!data || data.length === 0) break;
    allDbEmails.push(...data.map(e => e.uid));
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  console.log(`Emails in DB: ${allDbEmails.length}`);

  // Connect to iCloud
  const folder = process.env.ICLOUD_FOLDER!;
  console.log(`\nConnecting to iCloud...`);

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
    const mailbox = await client.mailboxOpen(folder);
    console.log(`Mailbox: ${mailbox.exists} messages\n`);

    // Get all UIDs from IMAP
    const allImapUids = await client.search({ all: true }, { uid: true });

    // Find missing UIDs
    const dbUidSet = new Set(allDbEmails);
    const missingUids = allImapUids.filter(uid => !dbUidSet.has(uid));

    console.log(`Missing ${missingUids.length} emails\n`);

    if (missingUids.length === 0) {
      console.log('All emails are synced!');
      await client.logout();
      return;
    }

    // Fetch missing emails in batches
    const batchSize = 50;
    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 0; i < missingUids.length; i += batchSize) {
      const batch = missingUids.slice(i, i + batchSize);
      const uidRange = batch.join(',');

      console.log(`Fetching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(missingUids.length / batchSize)} (${batch.length} messages)...`);

      const emails: EmailInsertData[] = [];

      for await (const message of client.fetch(uidRange, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
      }, { uid: true })) {
        try {
          const envelope = message.envelope;
          if (!envelope) continue;

          const fromAddress = envelope.from?.[0];

          emails.push({
            user_id: user.id,
            message_id: sanitizeText(envelope.messageId) || `uid-${message.uid}`,
            uid: message.uid,
            folder,
            subject: sanitizeText(envelope.subject),
            from_address: sanitizeText(fromAddress?.address || null),
            from_name: sanitizeText(fromAddress?.name || null),
            date: envelope.date?.toISOString() || null,
            seen: message.flags?.has('\\Seen') || false,
            has_attachments: hasAttachments(message.bodyStructure),
          });
        } catch (parseError) {
          console.error(`  Error parsing UID ${message.uid}:`, parseError);
          totalErrors++;
        }
      }

      // Insert one at a time to handle individual failures
      for (const email of emails) {
        const { error } = await supabase
          .from('emails')
          .upsert(email, {
            onConflict: 'user_id,message_id',
            ignoreDuplicates: true,
          });

        if (error) {
          console.error(`  Failed to insert UID ${email.uid}: ${error.message}`);
          totalErrors++;
        } else {
          totalInserted++;
        }
      }
    }

    console.log(`\n=== Sync Complete ===`);
    console.log(`Inserted: ${totalInserted}`);
    console.log(`Errors: ${totalErrors}`);

    // Final count
    const { count: finalCount } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    console.log(`Total emails in DB: ${finalCount}`);

    await client.logout();

  } catch (error) {
    console.error('Error:', error);
    try { await client.logout(); } catch { /* ignore */ }
  }
}

function hasAttachments(bodyStructure: unknown): boolean {
  if (!bodyStructure || typeof bodyStructure !== 'object') return false;
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

main().catch(console.error);
