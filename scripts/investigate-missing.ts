import { ImapFlow } from 'imapflow';

const MISSING_UIDS = [1553, 1554, 1555, 1565, 1680, 1745, 1871, 3590];

async function main() {
  console.log('=== Investigate Missing UIDs ===\n');

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

    // Try to get info about these UIDs using different methods
    for (const uid of MISSING_UIDS) {
      console.log(`=== UID ${uid} ===`);

      // Try search
      const searchResult = await client.search({ uid: `${uid}:${uid}` }, { uid: true });
      console.log(`  SEARCH result: ${searchResult.length > 0 ? searchResult : 'empty'}`);

      // Try fetch with just UID
      try {
        let foundAny = false;
        for await (const msg of client.fetch(`${uid}`, { uid: true }, { uid: true })) {
          console.log(`  FETCH returned UID: ${msg.uid}`);
          foundAny = true;
        }
        if (!foundAny) {
          console.log(`  FETCH returned nothing`);
        }
      } catch (e) {
        console.log(`  FETCH error: ${e}`);
      }

      // Try to get flags only
      try {
        const flagMsg = await client.fetchOne(`${uid}`, { uid: true, flags: true }, { uid: true });
        if (flagMsg) {
          console.log(`  FLAGS: ${flagMsg.flags ? Array.from(flagMsg.flags).join(', ') : 'none'}`);
        } else {
          console.log(`  FLAGS fetch returned null`);
        }
      } catch (e) {
        console.log(`  FLAGS error: ${e}`);
      }

      console.log('');
    }

    await client.logout();

  } catch (error) {
    console.error('Error:', error);
    try { await client.logout(); } catch { /* ignore */ }
  }
}

main().catch(console.error);
