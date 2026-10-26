import { beforeEach, describe, expect, test } from "bun:test";
import {
  AlreadyCycling,
  CyclingConcept,
  InvalidCycle,
  LastItem,
  NoLaterRun,
  NoSuchCycle,
  NotInCycle,
  RunUnderway,
  StartPassed,
} from "../../src/concepts/Cycling.ts";
import { DAY, HOUR, T0, at, useTestDb } from "../helpers.ts";

const db = useTestDb("cycling");
let cycling: CyclingConcept;
beforeEach(() => {
  cycling = new CyclingConcept(db());
});

/** A cycle starting at T0 (created at T0, so the start isn't in the past). */
const make = async (period: number, runs: number, start = T0) =>
  (await cycling.create({ start, period, runs, earliest: T0 })).cycle;
/** The current run number of item at a moment, or null when none. */
const runAt = async (item: string, now: Date) => (await cycling._currentRun({ item, now }))[0]?.run ?? null;
const previousAt = async (item: string, now: Date) => (await cycling._previousRun({ item, now }))[0]?.run ?? null;

describe("principle", () => {
  test("runs follow one another; a removed item finishes its run; runs extend but never cut the one underway", async () => {
    const cycle = await make(DAY, 3);
    await cycling.addItems({ cycle, items: ["gallery", "wing"] });
    expect(await runAt("gallery", at(HOUR))).toBe(0);
    expect(await runAt("gallery", at(DAY + HOUR))).toBe(1);
    await cycling.removeItem({ cycle, item: "wing", now: at(DAY + HOUR) }); // during run 1
    expect(await runAt("wing", at(DAY + 2 * HOUR))).toBe(1); // finishes run 1
    expect(await runAt("wing", at(2 * DAY + HOUR))).toBeNull(); // gone from run 2
    expect(await runAt("gallery", at(2 * DAY + HOUR))).toBe(2);
    expect(await runAt("gallery", at(3 * DAY + HOUR))).toBeNull();
    await expect(cycling.setRuns({ cycle, runs: 1, now: at(DAY + HOUR) })).rejects.toBeInstanceOf(RunUnderway);
    await cycling.setRuns({ cycle, runs: 4, now: at(DAY + HOUR) });
    expect(await runAt("gallery", at(3 * DAY + HOUR))).toBe(3);
    expect(await runAt("wing", at(3 * DAY + HOUR))).toBeNull();
  });
});

describe("create", () => {
  test("refuses INVALID_CYCLE for a bad period or number of runs, creating nothing", async () => {
    for (const [period, runs] of [[0, 1], [-DAY, 1], [DAY, 0], [DAY, 1.5]] as const) {
      await expect(cycling.create({ start: T0, period, runs, earliest: T0 })).rejects.toBeInstanceOf(InvalidCycle);
    }
    expect(await cycling._all({})).toEqual([]);
  });

  test("refuses START_PASSED for a start more than a minute before earliest; within the minute is fine", async () => {
    const MINUTE = 60_000;
    await expect(cycling.create({ start: at(-MINUTE - 1), period: DAY, runs: 1, earliest: T0 })).rejects.toBeInstanceOf(StartPassed);
    expect(await cycling._all({})).toEqual([]);
    await make(DAY, 1, at(-MINUTE));
  });

  test("reads a start sent as an ISO string", async () => {
    const cycle = await make(DAY, 1, at(DAY).toISOString() as unknown as Date);
    expect((await cycling._all({}))[0]).toEqual({ cycle, start: at(DAY), period: DAY, runs: 1 });
  });
});

describe("addItem and addItems", () => {
  test("refuses NO_SUCH_CYCLE", async () => {
    await expect(cycling.addItem({ cycle: "unknown", item: "g" })).rejects.toBeInstanceOf(NoSuchCycle);
    await expect(cycling.addItems({ cycle: "unknown", items: ["g"] })).rejects.toBeInstanceOf(NoSuchCycle);
    expect(await cycling._cycle({ item: "g" })).toEqual([]);
  });

  test("refuses ALREADY_CYCLING in the same cycle and in a second one; the item stays put", async () => {
    const cycle = await make(DAY, 1);
    const second = await make(HOUR, 1);
    await cycling.addItem({ cycle, item: "g" });
    await expect(cycling.addItem({ cycle, item: "g" })).rejects.toBeInstanceOf(AlreadyCycling);
    await expect(cycling.addItem({ cycle: second, item: "g" })).rejects.toBeInstanceOf(AlreadyCycling);
    expect((await cycling._cycle({ item: "g" }))[0]?.cycle).toBe(cycle);
  });

  test("addItems adds all or none: one already cycling, or one listed twice, adds nothing", async () => {
    const cycle = await make(DAY, 1);
    const other = await make(DAY, 1);
    await cycling.addItem({ cycle: other, item: "taken" });
    await expect(cycling.addItems({ cycle, items: ["a", "taken"] })).rejects.toBeInstanceOf(AlreadyCycling);
    await expect(cycling.addItems({ cycle, items: ["a", "a"] })).rejects.toBeInstanceOf(AlreadyCycling);
    expect(await cycling._items({ cycle })).toEqual([]);
    await cycling.addItems({ cycle, items: ["b", "a"] });
    expect((await cycling._items({ cycle })).map((r) => r.item)).toEqual(["a", "b"]);
  });
});

describe("removeItem", () => {
  test("before the cycle starts, takes the item out entirely", async () => {
    const cycle = await make(DAY, 2, at(DAY));
    await cycling.addItems({ cycle, items: ["a", "b"] });
    expect(await cycling.removeItem({ cycle, item: "a", now: T0 })).toEqual({});
    expect(await cycling._cycle({ item: "a" })).toEqual([]);
  });

  test("once started, the item stays for the run underway and leaves from the next", async () => {
    const cycle = await make(DAY, 3);
    await cycling.addItems({ cycle, items: ["a", "b"] });
    await cycling.removeItem({ cycle, item: "a", now: at(HOUR) });
    expect((await cycling._cycle({ item: "a" }))[0]?.itemRuns).toBe(1);
    expect(await runAt("a", at(2 * HOUR))).toBe(0);
    expect(await runAt("a", at(DAY + HOUR))).toBeNull();
  });

  test("refuses NOT_IN_CYCLE for an item elsewhere or already leaving", async () => {
    const cycle = await make(DAY, 3);
    const other = await make(DAY, 3);
    await cycling.addItems({ cycle, items: ["a", "b"] });
    await cycling.addItem({ cycle: other, item: "g" });
    await expect(cycling.removeItem({ cycle, item: "g", now: at(HOUR) })).rejects.toBeInstanceOf(NotInCycle);
    await cycling.removeItem({ cycle, item: "a", now: at(HOUR) });
    await expect(cycling.removeItem({ cycle, item: "a", now: at(HOUR) })).rejects.toBeInstanceOf(NotInCycle);
    expect((await cycling._cycle({ item: "g" }))[0]?.cycle).toBe(other);
  });

  test("refuses NO_LATER_RUN during the last run", async () => {
    const cycle = await make(DAY, 2);
    await cycling.addItems({ cycle, items: ["a", "b"] });
    await expect(cycling.removeItem({ cycle, item: "a", now: at(DAY + HOUR) })).rejects.toBeInstanceOf(NoLaterRun);
    expect((await cycling._cycle({ item: "a" }))[0]?.itemRuns).toBe(2);
  });

  test("refuses LAST_ITEM when no other item would be left, before or after the start", async () => {
    const upcoming = await make(DAY, 2, at(DAY));
    await cycling.addItem({ cycle: upcoming, item: "only" });
    await expect(cycling.removeItem({ cycle: upcoming, item: "only", now: T0 })).rejects.toBeInstanceOf(LastItem);
    const running = await make(DAY, 3);
    await cycling.addItems({ cycle: running, items: ["a", "b"] });
    await cycling.removeItem({ cycle: running, item: "a", now: at(HOUR) });
    await expect(cycling.removeItem({ cycle: running, item: "b", now: at(HOUR) })).rejects.toBeInstanceOf(LastItem);
  });

  test("refuses NO_SUCH_CYCLE", async () => {
    await expect(cycling.removeItem({ cycle: "unknown", item: "g", now: T0 })).rejects.toBeInstanceOf(NoSuchCycle);
  });
});

describe("setRuns", () => {
  test("extends a cycle, and shortens it down to the run underway", async () => {
    const cycle = await make(DAY, 5);
    await cycling.addItem({ cycle, item: "g" });
    await cycling.setRuns({ cycle, runs: 6, now: at(HOUR) });
    expect((await cycling._all({}))[0]?.runs).toBe(6);
    await cycling.setRuns({ cycle, runs: 3, now: at(2 * DAY + HOUR) }); // run 2 is underway, so 3 keeps it
    expect(await runAt("g", at(2 * DAY + 2 * HOUR))).toBe(2);
    expect(await runAt("g", at(3 * DAY + HOUR))).toBeNull();
  });

  test("before the start, any number of runs; after the end, it can be extended again", async () => {
    const cycle = await make(DAY, 3, at(DAY));
    await cycling.addItem({ cycle, item: "g" });
    await cycling.setRuns({ cycle, runs: 1, now: T0 });
    await cycling.setRuns({ cycle, runs: 4, now: at(10 * DAY) });
    expect((await cycling._all({}))[0]?.runs).toBe(4);
  });

  test("refuses RUN_UNDERWAY below the run underway, and runs are unchanged", async () => {
    const cycle = await make(DAY, 5);
    await cycling.addItem({ cycle, item: "g" });
    await expect(cycling.setRuns({ cycle, runs: 2, now: at(2 * DAY + HOUR) })).rejects.toBeInstanceOf(RunUnderway);
    expect((await cycling._all({}))[0]?.runs).toBe(5);
  });

  test("refuses LAST_ITEM when extending a cycle no item would stay in", async () => {
    // removeItem never lets every item leave, so the reachable case is a cycle with no items.
    const cycle = await make(DAY, 2);
    await expect(cycling.setRuns({ cycle, runs: 3, now: at(HOUR) })).rejects.toBeInstanceOf(LastItem);
    expect((await cycling._all({}))[0]?.runs).toBe(2);
  });

  test("refuses INVALID_CYCLE and NO_SUCH_CYCLE", async () => {
    const cycle = await make(DAY, 3);
    for (const runs of [0, 1.5]) {
      await expect(cycling.setRuns({ cycle, runs, now: T0 })).rejects.toBeInstanceOf(InvalidCycle);
    }
    await expect(cycling.setRuns({ cycle: "unknown", runs: 2, now: T0 })).rejects.toBeInstanceOf(NoSuchCycle);
  });
});

describe("delete", () => {
  test("deletes the cycle, answers its items, and frees them to join another", async () => {
    const cycle = await make(DAY, 1);
    await cycling.addItems({ cycle, items: ["g", "h"] });
    expect(await cycling.delete({ cycle })).toEqual({ items: ["g", "h"] });
    expect(await cycling._all({})).toEqual([]);
    expect(await cycling._cycle({ item: "g" })).toEqual([]);
    const next = await make(DAY, 1);
    await cycling.addItem({ cycle: next, item: "g" });
    expect((await cycling._cycle({ item: "g" }))[0]?.cycle).toBe(next);
  });

  test("refuses NO_SUCH_CYCLE", async () => {
    await expect(cycling.delete({ cycle: "unknown" })).rejects.toBeInstanceOf(NoSuchCycle);
  });
});

describe("queries", () => {
  test("_currentRun at every boundary", async () => {
    const cycle = await make(DAY, 2);
    await cycling.addItem({ cycle, item: "g" });
    expect(await runAt("g", at(-1))).toBeNull(); // before start
    expect(await cycling._currentRun({ item: "g", now: T0 })).toEqual([{ run: 0, start: T0, end: at(DAY) }]);
    expect(await runAt("g", at(DAY - 1))).toBe(0); // just before the boundary
    expect(await runAt("g", at(DAY))).toBe(1); // the boundary starts the next run
    expect(await runAt("g", at(2 * DAY))).toBeNull(); // after the last run
    expect(await runAt("not-cycled", at(HOUR))).toBeNull();
  });

  test("_previousRun: none in run 0, run k-1 in run k, and the item's last run after it left", async () => {
    const cycle = await make(DAY, 4);
    await cycling.addItems({ cycle, items: ["g", "h"] });
    expect(await previousAt("g", at(HOUR))).toBeNull();
    expect(await cycling._previousRun({ item: "g", now: at(DAY + HOUR) })).toEqual([{ run: 0, start: T0, end: at(DAY) }]);
    await cycling.removeItem({ cycle, item: "h", now: at(DAY + HOUR) }); // h's last run is 1
    expect(await previousAt("h", at(3 * DAY + HOUR))).toBe(1);
    expect(await previousAt("g", at(10 * DAY))).toBe(3);
    expect(await previousAt("not-cycled", at(DAY + HOUR))).toBeNull();
  });

  test("_run gives the window of runs the item is in, past or future, and nothing past them", async () => {
    const cycle = await make(DAY, 3);
    await cycling.addItems({ cycle, items: ["g", "h"] });
    expect(await cycling._run({ item: "g", run: 0 })).toEqual([{ start: T0, end: at(DAY) }]);
    expect(await cycling._run({ item: "g", run: 2 })).toEqual([{ start: at(2 * DAY), end: at(3 * DAY) }]);
    for (const run of [-1, 3, 1.5]) expect(await cycling._run({ item: "g", run })).toEqual([]);
    await cycling.removeItem({ cycle, item: "h", now: at(HOUR) });
    expect(await cycling._run({ item: "h", run: 1 })).toEqual([]);
    expect(await cycling._run({ item: "not-cycled", run: 0 })).toEqual([]);
  });

  test("_cycle and _items report each item's own number of runs", async () => {
    const cycle = await make(DAY, 3);
    await cycling.addItems({ cycle, items: ["b", "a"] });
    await cycling.removeItem({ cycle, item: "b", now: at(DAY + HOUR) });
    expect(await cycling._cycle({ item: "a" })).toEqual([{ cycle, start: T0, period: DAY, runs: 3, itemRuns: 3 }]);
    expect(await cycling._cycle({ item: "z" })).toEqual([]);
    expect(await cycling._items({ cycle })).toEqual([{ item: "a", itemRuns: 3 }, { item: "b", itemRuns: 2 }]);
    expect(await cycling._items({ cycle: "unknown" })).toEqual([]);
  });

  test("_overlapping finds cycles of the same length and runs whose time overlaps, and no others", async () => {
    const week = await make(7 * DAY, 2); // T0 .. 14 days
    await make(7 * DAY, 3); // different number of runs
    await make(DAY, 2); // different length
    const overlapping = (start: Date, except = "") => cycling._overlapping({ start, period: 7 * DAY, runs: 2, except });
    expect(await overlapping(at(13 * DAY))).toEqual([{ cycle: week }]);
    expect(await overlapping(at(14 * DAY))).toEqual([]); // starts just as it ends
    expect(await overlapping(at(-14 * DAY))).toEqual([]); // ends just as it starts
    expect(await overlapping(at(-13 * DAY))).toEqual([{ cycle: week }]);
    expect(await overlapping(at(-13 * DAY), week)).toEqual([]); // leaving that one out
  });

  test("_all is ordered by start", async () => {
    const later = await make(DAY, 1, at(DAY));
    const earlier = await make(DAY, 1);
    expect((await cycling._all({})).map((c) => c.cycle)).toEqual([earlier, later]);
  });
});
