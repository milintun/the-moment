import type { Db } from "mongodb";
import { CyclingConcept } from "./concepts/Cycling.ts";
import { NameTaken, NominatingConcept } from "./concepts/Nominating.ts";

/** The application's one nomination category. It is created at startup and never changes. */
export const FUTURE_GALLERIES = "Future galleries";

const WEEK = 7 * 24 * 60 * 60 * 1000;
// Rounds start Mondays at 12 AM US Eastern: Monday 5 January 2026, 00:00 EST. A week is a fixed
// length, so across daylight saving the boundary sits at 1 AM Eastern for half the year.
const WEEKLY_START = new Date("2026-01-05T05:00:00.000Z");
// ponytail: cycles have a whole number of runs, so "forever" is 5,200 weeks (about 100 years).
const WEEKLY_RUNS = 5200;

/**
 * Makes sure the Future galleries category exists and that its rounds follow the built-in
 * weekly cycle, which admins never see or manage. Harmless to call on every start.
 */
export async function ensureFutureGalleries(db: Db): Promise<void> {
  const nominating = new NominatingConcept(db);
  const cycling = new CyclingConcept(db);
  try {
    await nominating.createCategory({ name: FUTURE_GALLERIES });
  } catch (error) {
    if (!(error instanceof NameTaken)) throw error;
  }
  const category = (await nominating._categories({})).find((c) => c.name === FUTURE_GALLERIES)!.category;
  const [current] = await cycling._cycle({ item: category });
  const weekly = (c: { start: Date; period: number; runs: number }) =>
    c.period === WEEK && c.runs === WEEKLY_RUNS && c.start.getTime() === WEEKLY_START.getTime();
  if (current && weekly(current)) return;
  // One-time move: before rounds were weekly, admins put the category in a cycle of their own.
  // That cycle's rules (an item finishes its run before leaving) don't fit a move, so this
  // takes the category out directly.
  if (current) await db.collection("cycling.memberships").deleteOne({ _id: category as never });
  const existing = (await cycling._all({})).find(weekly);
  const cycle = existing?.cycle ?? (await cycling.create({ start: WEEKLY_START, period: WEEK, runs: WEEKLY_RUNS, earliest: WEEKLY_START })).cycle;
  await cycling.addItem({ cycle, item: category });
}
