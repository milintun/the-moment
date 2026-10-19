import { afterAll, beforeEach } from "bun:test";
import { MongoClient, type Db } from "mongodb";

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** The fixed starting moment every test begins at. */
export const T0 = new Date("2026-01-01T00:00:00Z");

/** T0 plus some milliseconds. */
export const at = (ms: number) => new Date(T0.getTime() + ms);

/** A clock that only moves when a test moves it. */
export class FakeClock {
  now = T0;
  read = () => this.now;
  set(date: Date) {
    this.now = date;
  }
  advance(ms: number) {
    this.now = new Date(this.now.getTime() + ms);
  }
}

/**
 * A database of its own for one concept test file, emptied before every test and
 * dropped afterwards. Returns a getter because the database is shared across the file.
 */
export function useTestDb(name: string): () => Db {
  const client = new MongoClient(process.env.MONGODB_URL!);
  const db = client.db(`themoment_test_${name}`);
  beforeEach(async () => {
    await db.dropDatabase();
  });
  afterAll(async () => {
    await db.dropDatabase();
    await client.close();
  });
  return () => db;
}
