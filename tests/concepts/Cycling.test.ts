import { beforeEach, describe, expect, test } from "bun:test";
import {
  AlreadyCycling,
  CyclingConcept,
  InvalidCycle,
  NoSuchCycle,
  NotInCycle,
} from "../../src/concepts/Cycling.ts";
import { DAY, HOUR, T0, at, useTestDb } from "../helpers.ts";

const db = useTestDb("cycling");
let cycling: CyclingConcept;
beforeEach(() => {
  cycling = new CyclingConcept(db());
});

/** The current run number of item at a moment, or null when none. */
const runAt = async (item: string, now: Date) => (await cycling._currentRun({ item, now }))[0]?.run ?? null;
const previousAt = async (item: string, now: Date) => (await cycling._previousRun({ item, now }))[0]?.run ?? null;

describe("principle", () => {
  test("runs follow one another, end with the last run, and can be extended", async () => {
    const { cycle } = await cycling.create({ start: T0, period: DAY, runs: 3 });
    await cycling.addItem({ cycle, item: "gallery" });
    await cycling.addItem({ cycle, item: "category" });
    for (const item of ["gallery", "category"]) {
      expect(await runAt(item, at(1 * HOUR))).toBe(0);
      expect(await runAt(item, at(DAY + HOUR))).toBe(1);
      expect(await runAt(item, at(2 * DAY + HOUR))).toBe(2);
      expect(await runAt(item, at(3 * DAY + HOUR))).toBeNull();
    }
    await cycling.setRuns({ cycle, runs: 4 });
    expect(await runAt("gallery", at(3 * DAY + HOUR))).toBe(3);
    expect(await runAt("category", at(3 * DAY + HOUR))).toBe(3);
  });
});

describe("create", () => {
  test("refuses INVALID_CYCLE for a bad period or number of runs, creating nothing", async () => {
    for (const [period, runs] of [[0, 1], [-DAY, 1], [DAY, 0], [DAY, 1.5]] as const) {
      await expect(cycling.create({ start: T0, period, runs })).rejects.toBeInstanceOf(InvalidCycle);
    }
    expect(await cycling._all({})).toEqual([]);
  });
});

describe("addItem", () => {
  test("refuses NO_SUCH_CYCLE", async () => {
    await expect(cycling.addItem({ cycle: "unknown", item: "g" })).rejects.toBeInstanceOf(NoSuchCycle);
    expect(await cycling._cycle({ item: "g" })).toEqual([]);
  });

  test("refuses ALREADY_CYCLING in the same cycle and in a second one; the item stays put", async () => {
    const { cycle } = await cycling.create({ start: T0, period: DAY, runs: 1 });
    const { cycle: second } = await cycling.create({ start: T0, period: HOUR, runs: 1 });
    await cycling.addItem({ cycle, item: "g" });
    await expect(cycling.addItem({ cycle, item: "g" })).rejects.toBeInstanceOf(AlreadyCycling);
    await expect(cycling.addItem({ cycle: second, item: "g" })).rejects.toBeInstanceOf(AlreadyCycling);
    expect((await cycling._cycle({ item: "g" }))[0]?.cycle).toBe(cycle);
  });
});

describe("removeItem", () => {
  test("removes the item, which then has no current run", async () => {
    const { cycle } = await cycling.create({ start: T0, period: DAY, runs: 1 });
    await cycling.addItem({ cycle, item: "g" });
    expect(await cycling.removeItem({ cycle, item: "g" })).toEqual({});
    expect(await runAt("g", at(HOUR))).toBeNull();
  });

  test("refuses NO_SUCH_CYCLE", async () => {
    await expect(cycling.removeItem({ cycle: "unknown", item: "g" })).rejects.toBeInstanceOf(NoSuchCycle);
  });

  test("refuses NOT_IN_CYCLE, leaving an item that is in another cycle there", async () => {
    const { cycle } = await cycling.create({ start: T0, period: DAY, runs: 1 });
    const { cycle: other } = await cycling.create({ start: T0, period: DAY, runs: 1 });
    await cycling.addItem({ cycle: other, item: "g" });
    await expect(cycling.removeItem({ cycle, item: "g" })).rejects.toBeInstanceOf(NotInCycle);
    expect((await cycling._cycle({ item: "g" }))[0]?.cycle).toBe(other);
  });
});

describe("setRuns", () => {
  test("extends a cycle", async () => {
    const { cycle } = await cycling.create({ start: T0, period: DAY, runs: 1 });
    await cycling.addItem({ cycle, item: "g" });
    expect(await cycling.setRuns({ cycle, runs: 2 })).toEqual({});
    expect(await runAt("g", at(DAY + HOUR))).toBe(1);
  });

  test("lowering runs below the current run ends the cycle immediately", async () => {
    const { cycle } = await cycling.create({ start: T0, period: DAY, runs: 5 });
    await cycling.addItem({ cycle, item: "g" });
    expect(await runAt("g", at(2 * DAY + HOUR))).toBe(2);
    await cycling.setRuns({ cycle, runs: 2 });
    expect(await runAt("g", at(2 * DAY + HOUR))).toBeNull();
  });

  test("refuses INVALID_CYCLE and runs are unchanged", async () => {
    const { cycle } = await cycling.create({ start: T0, period: DAY, runs: 3 });
    for (const runs of [0, 1.5]) {
      await expect(cycling.setRuns({ cycle, runs })).rejects.toBeInstanceOf(InvalidCycle);
    }
    expect((await cycling._all({}))[0]?.runs).toBe(3);
  });

  test("refuses NO_SUCH_CYCLE", async () => {
    await expect(cycling.setRuns({ cycle: "unknown", runs: 2 })).rejects.toBeInstanceOf(NoSuchCycle);
  });
});

describe("delete", () => {
  test("deletes the cycle and frees its items to join another cycle", async () => {
    const { cycle } = await cycling.create({ start: T0, period: DAY, runs: 1 });
    await cycling.addItem({ cycle, item: "g" });
    expect(await cycling.delete({ cycle })).toEqual({});
    expect(await cycling._all({})).toEqual([]);
    expect(await cycling._cycle({ item: "g" })).toEqual([]);
    const { cycle: next } = await cycling.create({ start: T0, period: DAY, runs: 1 });
    await cycling.addItem({ cycle: next, item: "g" });
    expect((await cycling._cycle({ item: "g" }))[0]?.cycle).toBe(next);
  });

  test("refuses NO_SUCH_CYCLE", async () => {
    await expect(cycling.delete({ cycle: "unknown" })).rejects.toBeInstanceOf(NoSuchCycle);
  });
});

describe("queries", () => {
  test("_currentRun at every boundary", async () => {
    const { cycle } = await cycling.create({ start: T0, period: DAY, runs: 2 });
    await cycling.addItem({ cycle, item: "g" });
    expect(await runAt("g", at(-1))).toBeNull(); // before start
    expect(await cycling._currentRun({ item: "g", now: T0 })).toEqual([{ run: 0, start: T0, end: at(DAY) }]);
    expect(await runAt("g", at(DAY - 1))).toBe(0); // just before the boundary
    expect(await runAt("g", at(DAY))).toBe(1); // the boundary starts the next run
    expect(await runAt("g", at(2 * DAY))).toBeNull(); // after the last run
    expect(await runAt("not-cycled", at(HOUR))).toBeNull();
  });

  test("_previousRun: none in run 0, run k-1 in run k, and the last run after the end", async () => {
    const { cycle } = await cycling.create({ start: T0, period: DAY, runs: 3 });
    await cycling.addItem({ cycle, item: "g" });
    expect(await previousAt("g", at(HOUR))).toBeNull();
    expect(await cycling._previousRun({ item: "g", now: at(DAY + HOUR) })).toEqual([
      { run: 0, start: T0, end: at(DAY) },
    ]);
    expect(await previousAt("g", at(2 * DAY + HOUR))).toBe(1);
    expect(await previousAt("g", at(10 * DAY))).toBe(2);
    expect(await previousAt("not-cycled", at(DAY + HOUR))).toBeNull();
  });

  test("_run gives any run's window, past or future, and nothing for runs the cycle doesn't have", async () => {
    const { cycle } = await cycling.create({ start: T0, period: DAY, runs: 3 });
    await cycling.addItem({ cycle, item: "g" });
    expect(await cycling._run({ item: "g", run: 0 })).toEqual([{ start: T0, end: at(DAY) }]);
    expect(await cycling._run({ item: "g", run: 2 })).toEqual([{ start: at(2 * DAY), end: at(3 * DAY) }]);
    for (const run of [-1, 3, 1.5]) expect(await cycling._run({ item: "g", run })).toEqual([]);
    expect(await cycling._run({ item: "not-cycled", run: 0 })).toEqual([]);
  });

  test("_cycle and _items for members and non-members", async () => {
    const { cycle } = await cycling.create({ start: T0, period: DAY, runs: 2 });
    await cycling.addItem({ cycle, item: "b" });
    await cycling.addItem({ cycle, item: "a" });
    expect(await cycling._cycle({ item: "a" })).toEqual([{ cycle, start: T0, period: DAY, runs: 2 }]);
    expect(await cycling._cycle({ item: "z" })).toEqual([]);
    expect(await cycling._items({ cycle })).toEqual([{ item: "a" }, { item: "b" }]);
    expect(await cycling._items({ cycle: "unknown" })).toEqual([]);
  });

  test("_all is ordered by start", async () => {
    const { cycle: later } = await cycling.create({ start: at(DAY), period: DAY, runs: 1 });
    const { cycle: earlier } = await cycling.create({ start: T0, period: DAY, runs: 1 });
    expect((await cycling._all({})).map((c) => c.cycle)).toEqual([earlier, later]);
  });
});
