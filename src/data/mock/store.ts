/**
 * In-memory store behind api.ts. Seeded from seed.ts, persisted to localStorage when available.
 * Only api.ts imports this file (CLAUDE.md rule 1).
 */
import { createSeed, SEED_VERSION, type MockDb } from './seed';

const STORAGE_KEY = 'qai.mockDb';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function load(): MockDb | null {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const db = JSON.parse(raw) as MockDb;
    return db.seedVersion === SEED_VERSION ? db : null; // reseed when the seed changes
  } catch {
    return null;
  }
}

let db: MockDb | null = null;

export function getDb(): MockDb {
  if (!db) db = load() ?? createSeed();
  return db;
}

/** Apply a change and persist it. */
export function mutate<T>(change: (db: MockDb) => T): T {
  const current = getDb();
  const out = change(current);
  storage()?.setItem(STORAGE_KEY, JSON.stringify(current));
  return out;
}

/** Replace everything (restore from backup, factory reset) and persist. */
export function replaceDb(next: Omit<MockDb, 'seedVersion'>): void {
  db = { ...structuredClone(next), seedVersion: SEED_VERSION };
  storage()?.setItem(STORAGE_KEY, JSON.stringify(db));
}

/** Back to the seed (dev helper; also used by tests). */
export function resetMockDb(): void {
  db = createSeed();
  storage()?.removeItem(STORAGE_KEY);
}

// ---------- simulated latency (07: 200–500 ms) ----------
let latency = { min: 200, max: 500 };

export function setMockLatency(min: number, max: number = min): void {
  latency = { min, max };
}

export function delay(): Promise<void> {
  const ms = latency.min + Math.random() * (latency.max - latency.min);
  return ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
}
