import { ImapFlow } from "imapflow";
import { homedir } from "os";
import { join } from "path";

interface Settings {
  emailEnabled: boolean;
  emailHost: string;
  emailPort: number;
  emailAddress: string;
  emailPassword: string;
}

interface Email {
  from: string;
  subject: string;
  date: string;
  preview: string;
}

// Load settings from ~/.breev/settings.json
const settingsPath = join(homedir(), ".breev", "settings.json");
const settingsFile = Bun.file(settingsPath);

if (!(await settingsFile.exists())) {
  console.log(JSON.stringify([]));
  process.exit(0);
}

const settings: Settings = await settingsFile.json();

if (!settings.emailEnabled) {
  console.log(JSON.stringify([]));
  process.exit(0);
}

async function fetchTodaysEmails(): Promise<Email[]> {
  const client = new ImapFlow({
    host: settings.emailHost,
    port: settings.emailPort,
    secure: true,
    auth: {
      user: settings.emailAddress,
      pass: settings.emailPassword,
    },
    logger: false,
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });

  const emails: Email[] = [];

  try {
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const messages = await client.search({
        since: today,
      });

      if (messages.length === 0) {
        return emails;
      }

      for await (const message of client.fetch(messages, {
        envelope: true,
        bodyStructure: true,
        source: { start: 0, maxLength: 500 },
      })) {
        const envelope = message.envelope;
        const fromAddr = envelope.from?.[0];
        const fromStr = fromAddr
          ? fromAddr.name
            ? `${fromAddr.name} <${fromAddr.address}>`
            : fromAddr.address || "Unknown"
          : "Unknown";

        emails.push({
          from: fromStr,
          subject: envelope.subject || "(No subject)",
          date: envelope.date?.toISOString() || new Date().toISOString(),
          preview: "",
        });
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error("IMAP error:", err);
    throw err;
  }

  return emails;
}

// Main execution
const emails = await fetchTodaysEmails();
console.log(JSON.stringify(emails, null, 2));
