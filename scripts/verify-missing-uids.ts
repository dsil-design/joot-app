import { ImapFlow } from 'imapflow';

async function main() {
  console.log('=== Verify Missing UIDs ===\n');

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
    console.log(`Mailbox: ${mailbox.exists} messages, uidNext: ${mailbox.uidNext}\n`);

    // Search for specific UIDs
    const checkUids = [1553, 1554, 1555, 1565, 1680, 1745, 1871, 3590];

    for (const uid of checkUids) {
      try {
        const result = await client.search({ uid: `${uid}:${uid}` }, { uid: true });
        console.log(`UID ${uid}: ${result.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);
      } catch (e) {
        console.log(`UID ${uid}: ERROR - ${e}`);
      }
    }

    await client.logout();

  } catch (error) {
    console.error('Error:', error);
    try { await client.logout(); } catch { /* ignore */ }
  }
}

main().catch(console.error);
