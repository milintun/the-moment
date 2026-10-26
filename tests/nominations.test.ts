import { describe, expect, test } from "bun:test";
import { CyclingConcept } from "../src/concepts/Cycling.ts";
import { NominatingConcept } from "../src/concepts/Nominating.ts";
import { FUTURE_GALLERIES, ensureFutureGalleries } from "../src/nominations.ts";
import { useTestDb } from "./helpers.ts";

const db = useTestDb("future_galleries");

describe("ensureFutureGalleries (run at every server start)", () => {
  test("creates the one Future galleries category", async () => {
    await ensureFutureGalleries(db());
    expect((await new NominatingConcept(db())._categories({})).map((c) => c.name)).toEqual([FUTURE_GALLERIES]);
  });

  test("never creates a second one, so restarting changes nothing", async () => {
    await ensureFutureGalleries(db());
    const [first] = await new NominatingConcept(db())._categories({});
    await ensureFutureGalleries(db());
    expect(await new NominatingConcept(db())._categories({})).toEqual([first!]);
  });
});

describe("weekly nomination rounds", () => {
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const categoryOf = async () => (await new NominatingConcept(db())._categories({}))[0]!.category;

  test("the category follows a weekly cycle starting on a Monday at 12 AM Eastern", async () => {
    await ensureFutureGalleries(db());
    const [cycle] = await new CyclingConcept(db())._cycle({ item: await categoryOf() });
    expect(cycle).toMatchObject({ period: WEEK, start: new Date("2026-01-05T05:00:00.000Z") });
    expect(cycle!.start.getUTCDay()).toBe(1); // Monday
    // Rounds are running now, a week at a time.
    const [round] = await new CyclingConcept(db())._currentRun({ item: await categoryOf(), now: new Date() });
    expect(round!.end.getTime() - round!.start.getTime()).toBe(WEEK);
  });

  test("restarting reuses the same weekly cycle", async () => {
    await ensureFutureGalleries(db());
    await ensureFutureGalleries(db());
    expect(await new CyclingConcept(db())._all({})).toHaveLength(1);
  });

  test("moves the category out of an admin-made cycle it was in before, leaving that cycle's galleries", async () => {
    const nominating = new NominatingConcept(db());
    const cycling = new CyclingConcept(db());
    const { category } = await nominating.createCategory({ name: FUTURE_GALLERIES });
    const old = new Date();
    const { cycle } = await cycling.create({ start: old, period: WEEK, runs: 2, earliest: old });
    await cycling.addItems({ cycle, items: [category, "gallery"] });
    await ensureFutureGalleries(db());
    expect((await cycling._cycle({ item: category }))[0]?.cycle).not.toBe(cycle);
    expect((await cycling._items({ cycle })).map((i) => i.item)).toEqual(["gallery"]);
  });
});
