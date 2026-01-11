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

function sanitizeText(text: string | null): string | null {
  if (!text) return null;
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

async function main() {
  console.log('=== Sync Remaining Emails (with UID-based message_id) ===\n');

  const supabase = createServiceRoleClient();

  // Get user
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);

  const user = users![0];

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
  console.log(`Connecting to iCloud...`);

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

    // Fetch missing emails
    const uidRange = missingUids.join(',');

    for await (const message of client.fetch(uidRange, {
      uid: true,
      envelope: true,
      flags: true,
      bodyStructure: true,
    }, { uid: true })) {
      try {
        const envelope = message.envelope;
        if (!envelope) {
          console.log(`  UID ${message.uid}: No envelope`);
          continue;
        }

        const fromAddress = envelope.from?.[0];
        const originalMessageId = envelope.messageId;

        // Use UID as message_id if none exists OR to ensure uniqueness
        // This ensures each UID gets its own record
        const email: EmailInsertData = {
          user_id: user.id,
          message_id: `uid-${message.uid}-${folder}`,
          uid: message.uid,
          folder,
          subject: sanitizeText(envelope.subject),
          from_address: sanitizeText(fromAddress?.address || null),
          from_name: sanitizeText(fromAddress?.name || null),
          date: envelope.date?.toISOString() || null,
          seen: message.flags?.has('\\Seen') || false,
          has_attachments: hasAttachments(message.bodyStructure),
        };

        const { error } = await supabase
          .from('emails')
          .insert(email);

        if (error) {
          console.log(`  UID ${message.uid}: ${error.message}`);
          console.log(`    Subject: ${email.subject?.substring(0, 50)}`);
          console.log(`    Original message_id: ${originalMessageId}`);
        } else {
          console.log(`  UID ${message.uid}: Inserted`);
        }
      } catch (parseError) {
        console.error(`  Error parsing UID ${message.uid}:`, parseError);
      }
    }

    // Final count
    const { count: finalCount } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    console.log(`\nTotal emails in DB: ${finalCount}`);

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
