import { ImapFlow } from 'imapflow';
import { createServiceRoleClient } from '../src/lib/supabase/server';

const MISSING_UIDS = [1553, 1554, 1555, 1565, 1680, 1745, 1871, 3590];

function sanitizeText(text: string | null): string | null {
  if (!text) return null;
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
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

async function main() {
  console.log('=== Fetch Missing Emails One by One ===\n');

  const supabase = createServiceRoleClient();
  const { data: users } = await supabase.from('users').select('id').limit(1);
  const userId = users![0].id;

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
    await client.mailboxOpen(folder);
    console.log('Connected!\n');

    for (const uid of MISSING_UIDS) {
      console.log(`Fetching UID ${uid}...`);

      try {
        const message = await client.fetchOne(uid.toString(), {
          uid: true,
          envelope: true,
          flags: true,
          bodyStructure: true,
        }, { uid: true });

        if (!message || !message.envelope) {
          console.log(`  No data returned`);
          continue;
        }

        const envelope = message.envelope;
        const fromAddress = envelope.from?.[0];

        console.log(`  Subject: ${envelope.subject?.substring(0, 50)}`);
        console.log(`  From: ${fromAddress?.address}`);
        console.log(`  Date: ${envelope.date}`);

        const email = {
          user_id: userId,
          message_id: `uid-${uid}-${folder}`,
          uid: uid,
          folder,
          subject: sanitizeText(envelope.subject),
          from_address: sanitizeText(fromAddress?.address || null),
          from_name: sanitizeText(fromAddress?.name || null),
          date: envelope.date?.toISOString() || null,
          seen: message.flags?.has('\\Seen') || false,
          has_attachments: hasAttachments(message.bodyStructure),
        };

        const { error } = await supabase.from('emails').insert(email);

        if (error) {
          console.log(`  DB Error: ${error.message}`);
        } else {
          console.log(`  Inserted!`);
        }
      } catch (e) {
        console.log(`  Fetch Error: ${e}`);
      }
      console.log('');
    }

    // Final count
    const { count } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    console.log(`\nTotal emails in DB: ${count}`);

    await client.logout();

  } catch (error) {
    console.error('Error:', error);
    try { await client.logout(); } catch { /* ignore */ }
  }
}

main().catch(console.error);
