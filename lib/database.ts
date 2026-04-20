import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DependencyReport } from "@/lib/dependency-checker";

export type EntitlementType = "single" | "subscription";

export interface Entitlement {
  token: string;
  type: EntitlementType;
  scansRemaining: number | null;
  expiresAt: string | null;
  orderId?: string;
  customerEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanRecord {
  id: string;
  source: "upload" | "github";
  projectName: string;
  filesScanned: number;
  createdAt: string;
  report: DependencyReport;
}

interface DatabaseSchema {
  scans: Record<string, ScanRecord>;
  entitlements: Record<string, Entitlement>;
}

const dataFilePath = path.join(process.cwd(), "data", "database.json");
let operationQueue: Promise<void> = Promise.resolve();

function defaultDatabase(): DatabaseSchema {
  return {
    scans: {},
    entitlements: {},
  };
}

async function ensureDatabase() {
  await mkdir(path.dirname(dataFilePath), { recursive: true });

  try {
    await readFile(dataFilePath, "utf8");
  } catch {
    await writeFile(dataFilePath, JSON.stringify(defaultDatabase(), null, 2), "utf8");
  }
}

async function readDatabase() {
  await ensureDatabase();
  const content = await readFile(dataFilePath, "utf8");

  try {
    const parsed = JSON.parse(content) as DatabaseSchema;
    return {
      scans: parsed.scans ?? {},
      entitlements: parsed.entitlements ?? {},
    };
  } catch {
    return defaultDatabase();
  }
}

async function writeDatabase(database: DatabaseSchema) {
  await writeFile(dataFilePath, JSON.stringify(database, null, 2), "utf8");
}

function enqueueDatabaseWrite<T>(operation: () => Promise<T>): Promise<T> {
  const run = operationQueue.then(operation, operation);
  operationQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function isEntitlementActive(entitlement: Entitlement | null) {
  if (!entitlement) {
    return false;
  }

  if (entitlement.expiresAt && new Date(entitlement.expiresAt).getTime() < Date.now()) {
    return false;
  }

  if (entitlement.type === "single") {
    return (entitlement.scansRemaining ?? 0) > 0;
  }

  return true;
}

export async function getEntitlement(token: string) {
  const database = await readDatabase();
  return database.entitlements[token] ?? null;
}

export async function upsertEntitlement(input: {
  token: string;
  type: EntitlementType;
  scansRemaining: number | null;
  expiresAt: string | null;
  orderId?: string;
  customerEmail?: string;
}) {
  return enqueueDatabaseWrite(async () => {
    const database = await readDatabase();
    const previous = database.entitlements[input.token];
    const now = new Date().toISOString();

    const nextValue: Entitlement = {
      token: input.token,
      type: input.type,
      scansRemaining: input.scansRemaining,
      expiresAt: input.expiresAt,
      orderId: input.orderId ?? previous?.orderId,
      customerEmail: input.customerEmail ?? previous?.customerEmail,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };

    database.entitlements[input.token] = nextValue;
    await writeDatabase(database);

    return nextValue;
  });
}

export async function consumeEntitlementScan(token: string) {
  return enqueueDatabaseWrite(async () => {
    const database = await readDatabase();
    const entitlement = database.entitlements[token];

    if (!isEntitlementActive(entitlement ?? null)) {
      return null;
    }

    if (entitlement.type === "single") {
      const scansRemaining = Math.max((entitlement.scansRemaining ?? 0) - 1, 0);
      database.entitlements[token] = {
        ...entitlement,
        scansRemaining,
        updatedAt: new Date().toISOString(),
      };
    } else {
      database.entitlements[token] = {
        ...entitlement,
        updatedAt: new Date().toISOString(),
      };
    }

    await writeDatabase(database);
    return database.entitlements[token];
  });
}

export async function saveScan(input: Omit<ScanRecord, "id" | "createdAt">) {
  return enqueueDatabaseWrite(async () => {
    const database = await readDatabase();
    const id = randomUUID();

    const scanRecord: ScanRecord = {
      ...input,
      id,
      createdAt: new Date().toISOString(),
    };

    database.scans[id] = scanRecord;
    await writeDatabase(database);

    return scanRecord;
  });
}

export async function getScan(id: string) {
  const database = await readDatabase();
  return database.scans[id] ?? null;
}
