import { ImapFlow } from 'imapflow';
import { createServiceRoleClient } from '../src/lib/supabase/server';

const MISSING_UIDS = [1553, 1554, 1555, 1565, 1680, 1745, 1871, 3590];

function sanitizeText(text: string | null): string | null {
  if (!text) return null;
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

async function main() {
  console.log('=== Fetch Missing Emails (Final Attempt) ===\n');

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
        // Fetch just flags first
        const flagsMsg = await client.fetchOne(`${uid}`, { uid: true, flags: true }, { uid: true });
        const seen = flagsMsg?.flags?.has('\\Seen') || false;

        // Try fetching envelope separately
        let subject: string | null = null;
        let fromAddress: string | null = null;
        let fromName: string | null = null;
        let date: Date | null = null;

        try {
          const envMsg = await client.fetchOne(`${uid}`, { uid: true, envelope: true }, { uid: true });
          if (envMsg?.envelope) {
            subject = sanitizeText(envMsg.envelope.subject);
            fromAddress = sanitizeText(envMsg.envelope.from?.[0]?.address || null);
            fromName = sanitizeText(envMsg.envelope.from?.[0]?.name || null);
            date = envMsg.envelope.date || null;
          }
        } catch (envError) {
          console.log(`  Envelope fetch failed: ${envError}`);
        }

        console.log(`  Subject: ${subject || '(unknown)'}`);
        console.log(`  From: ${fromAddress || '(unknown)'}`);
        console.log(`  Date: ${date || '(unknown)'}`);

        const email = {
          user_id: userId,
          message_id: `uid-${uid}-${folder}`,
          uid: uid,
          folder,
          subject: subject || `(Unable to fetch - UID ${uid})`,
          from_address: fromAddress,
          from_name: fromName,
          date: date?.toISOString() || null,
          seen,
          has_attachments: false,
        };

        const { error } = await supabase.from('emails').insert(email);

        if (error) {
          console.log(`  DB Error: ${error.message}`);
        } else {
          console.log(`  Inserted!`);
        }
      } catch (e) {
        console.log(`  Error: ${e}`);
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
