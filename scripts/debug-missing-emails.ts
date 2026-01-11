import { ImapFlow } from 'imapflow';

const MISSING_UIDS = [1553, 1554, 1555, 1565, 1680, 1745, 1871, 3590];

async function main() {
  console.log('=== Debug Missing Emails ===\n');

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

    console.log(`\nFetching UIDs: ${MISSING_UIDS.join(', ')}\n`);

    const uidRange = MISSING_UIDS.join(',');

    let count = 0;
    for await (const message of client.fetch(uidRange, {
      uid: true,
      envelope: true,
      flags: true,
    }, { uid: true })) {
      count++;
      const envelope = message.envelope;
      console.log(`UID ${message.uid}:`);
      console.log(`  Subject: ${envelope?.subject?.substring(0, 60) || '(none)'}`);
      console.log(`  From: ${envelope?.from?.[0]?.address || '(none)'}`);
      console.log(`  Date: ${envelope?.date || '(none)'}`);
      console.log(`  MessageId: ${envelope?.messageId || '(none)'}`);
      console.log('');
    }

    console.log(`Total fetched: ${count} of ${MISSING_UIDS.length}`);

    await client.logout();

  } catch (error) {
    console.error('Error:', error);
    try { await client.logout(); } catch { /* ignore */ }
  }
}

main().catch(console.error);
