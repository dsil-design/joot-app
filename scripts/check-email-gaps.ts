import { ImapFlow } from 'imapflow';
import { createServiceRoleClient } from '../src/lib/supabase/server';

async function main() {
  console.log('=== Email Gap Analysis ===\n');

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

  console.log(`Total emails in DB: ${allDbEmails.length}`);
  console.log(`UID range: ${allDbEmails[0]} - ${allDbEmails[allDbEmails.length - 1]}`);

  // Connect to iCloud to get all UIDs
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

  await client.connect();
  const mailbox = await client.mailboxOpen(folder);
  console.log(`Mailbox has ${mailbox.exists} messages`);

  // Get all UIDs from IMAP
  console.log('Fetching all UIDs from IMAP...');
  const allImapUids = await client.search({ all: true }, { uid: true });
  console.log(`IMAP has ${allImapUids.length} UIDs`);

  await client.logout();

  // Find missing UIDs
  const dbUidSet = new Set(allDbEmails);
  const missingUids = allImapUids.filter(uid => !dbUidSet.has(uid));

  console.log(`\n=== Results ===`);
  console.log(`Emails in mailbox: ${allImapUids.length}`);
  console.log(`Emails in database: ${allDbEmails.length}`);
  console.log(`Missing from database: ${missingUids.length}`);

  if (missingUids.length > 0 && missingUids.length < 50) {
    console.log(`Missing UIDs: ${missingUids.join(', ')}`);
  } else if (missingUids.length >= 50) {
    console.log(`First 20 missing UIDs: ${missingUids.slice(0, 20).join(', ')}`);
    console.log(`Last 20 missing UIDs: ${missingUids.slice(-20).join(', ')}`);
  }
}

main().catch(console.error);
