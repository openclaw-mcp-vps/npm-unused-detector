import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type SessionRecord = {
  sessionId: string;
  email: string | null;
  paidAt: string;
};

type DataStore = {
  stripeSessions: Record<string, SessionRecord>;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "purchases.json");

const EMPTY_DB: DataStore = {
  stripeSessions: {},
};

let writeQueue = Promise.resolve();

async function ensureDataFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(EMPTY_DB, null, 2), "utf8");
  }
}

async function readDb(): Promise<DataStore> {
  await ensureDataFile();
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DataStore>;
    return {
      stripeSessions: parsed.stripeSessions ?? {},
    };
  } catch {
    return { ...EMPTY_DB };
  }
}

async function writeDb(data: DataStore): Promise<void> {
  await ensureDataFile();
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task).catch(() => undefined);
  return writeQueue;
}

export async function recordCompletedStripeCheckout(params: {
  sessionId: string;
  email: string | null;
  paidAt?: string;
}): Promise<void> {
  await enqueueWrite(async () => {
    const db = await readDb();
    db.stripeSessions[params.sessionId] = {
      sessionId: params.sessionId,
      email: params.email,
      paidAt: params.paidAt ?? new Date().toISOString(),
    };
    await writeDb(db);
  });
}

export async function getStripeSession(
  sessionId: string
): Promise<SessionRecord | null> {
  const db = await readDb();
  return db.stripeSessions[sessionId] ?? null;
}
