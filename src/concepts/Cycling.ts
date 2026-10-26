import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidCycle extends Error {} // 400
export class AlreadyCycling extends Error {} // 409 conflict
export class NoSuchCycle extends Error {} // 404
export class NotInCycle extends Error {} // 404
export class NoLaterRun extends Error {} // 409 conflict
export class LastItem extends Error {} // 409 conflict
export class RunUnderway extends Error {} // 409 conflict
export class StartPassed extends Error {} // 400

interface Cycle {
  _id: string;
  start: Date;
  period: number; // milliseconds
  runs: number;
}

// One document per item in a cycle. Using the item as _id means an item can
// belong to at most one cycle, with no extra index.
interface Membership {
  _id: string; // the item
  cycle: string;
  lastRun?: number; // set once the item is leaving: it is active in runs 0..lastRun only
}

type Row = { cycle: string; start: Date; period: number; runs: number };

const MINUTE = 60 * 1000;

function validRuns(runs: number): boolean {
  return Number.isInteger(runs) && runs >= 1;
}

/** The run happening at `now` counted from 0: negative before the start, `runs` or more after the end. */
const runAt = (cycle: Cycle, now: Date) => Math.floor((now.getTime() - cycle.start.getTime()) / cycle.period);

/** How many runs the item is active in. */
const itemRuns = (cycle: Cycle, membership: Membership) =>
  membership.lastRun === undefined ? cycle.runs : Math.min(cycle.runs, membership.lastRun + 1);

export class CyclingConcept {
  private readonly cycles: Collection<Cycle>;
  private readonly memberships: Collection<Membership>;
  private indexed = false;

  constructor(db: Db) {
    this.cycles = db.collection<Cycle>("cycling.cycles");
    this.memberships = db.collection<Membership>("cycling.memberships");
  }

  async #ensureIndexes() {
    if (this.indexed) return;
    await this.memberships.createIndex({ cycle: 1 });
    this.indexed = true;
  }

  async create({ start, period, runs, earliest }: { start: Date; period: number; runs: number; earliest: Date }): Promise<{ cycle: string }> {
    // Times sent in a request arrive as ISO strings; new Date() reads either form.
    const begins = new Date(start);
    if (!(period > 0) || !Number.isFinite(period) || !validRuns(runs) || Number.isNaN(begins.getTime())) {
      throw new InvalidCycle("A cycle needs a positive period and at least one run.");
    }
    // A minute's grace: starts are picked to the minute, so "now" is already a few seconds old on arrival.
    if (begins.getTime() < new Date(earliest).getTime() - MINUTE) throw new StartPassed("A cycle can't start in the past.");
    const cycle = crypto.randomUUID();
    await this.cycles.insertOne({ _id: cycle, start: begins, period, runs });
    return { cycle };
  }

  async addItem({ cycle, item }: { cycle: string; item: string }): Promise<Record<string, never>> {
    return this.addItems({ cycle, items: [item] });
  }

  async addItems({ cycle, items }: { cycle: string; items: string[] }): Promise<Record<string, never>> {
    await this.#ensureIndexes();
    if ((await this.cycles.findOne({ _id: cycle })) === null) throw new NoSuchCycle("There is no such cycle.");
    const already = new AlreadyCycling("This item already belongs to a cycle.");
    if (new Set(items).size !== items.length) throw already;
    if (await this.memberships.findOne({ _id: { $in: items } })) throw already;
    try {
      // ponytail: the check above and this insert aren't one transaction; two admins adding the same
      // item at once would leave some of the batch in. Items are fresh galleries, so it can't happen today.
      if (items.length) await this.memberships.insertMany(items.map((item) => ({ _id: item, cycle })));
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) throw already;
      throw error;
    }
    return {};
  }

  async removeItem({ cycle, item, now }: { cycle: string; item: string; now: Date }): Promise<Record<string, never>> {
    const found = await this.cycles.findOne({ _id: cycle });
    if (found === null) throw new NoSuchCycle("There is no such cycle.");
    const membership = await this.memberships.findOne({ _id: item, cycle });
    if (membership === null || membership.lastRun !== undefined) throw new NotInCycle("This item is not in the cycle.");
    const run = runAt(found, now);
    if (run >= found.runs - 1) throw new NoLaterRun("There is no later run for this item to leave from.");
    // The item leaves from run `leaving`; some other item must still be active then.
    const leaving = Math.max(run + 1, 0);
    const others = await this.memberships.find({ cycle, _id: { $ne: item } }).toArray();
    if (!others.some((m) => itemRuns(found, m) > leaving)) throw new LastItem("Every run needs at least one item.");
    if (run < 0) await this.memberships.deleteOne({ _id: item });
    else await this.memberships.updateOne({ _id: item }, { $set: { lastRun: run } });
    return {};
  }

  async setRuns({ cycle, runs, now }: { cycle: string; runs: number; now: Date }): Promise<Record<string, never>> {
    const found = await this.cycles.findOne({ _id: cycle });
    if (found === null) throw new NoSuchCycle("There is no such cycle.");
    if (!validRuns(runs)) throw new InvalidCycle("A cycle needs a positive period and at least one run.");
    const run = runAt(found, now);
    if (run >= 0 && run < found.runs && runs < run + 1) {
      throw new RunUnderway("A cycle can't end before the run underway has finished.");
    }
    if (runs > found.runs) {
      const members = await this.memberships.find({ cycle }).toArray();
      if (members.every((m) => m.lastRun !== undefined)) throw new LastItem("Every run needs at least one item.");
    }
    await this.cycles.updateOne({ _id: cycle }, { $set: { runs } });
    return {};
  }

  async delete({ cycle }: { cycle: string }): Promise<{ items: string[] }> {
    const { deletedCount } = await this.cycles.deleteOne({ _id: cycle });
    if (deletedCount === 0) throw new NoSuchCycle("There is no such cycle.");
    const items = (await this.memberships.find({ cycle }).sort({ _id: 1 }).toArray()).map((m) => m._id);
    await this.memberships.deleteMany({ cycle });
    return { items };
  }

  async _cycle({ item }: { item: string }): Promise<Array<Row & { itemRuns: number }>> {
    const found = await this.#membershipOf(item);
    if (found === null) return [];
    const { cycle, membership } = found;
    return [{ cycle: cycle._id, start: cycle.start, period: cycle.period, runs: cycle.runs, itemRuns: itemRuns(cycle, membership) }];
  }

  async _currentRun({ item, now }: { item: string; now: Date }): Promise<Array<{ run: number; start: Date; end: Date }>> {
    const found = await this.#membershipOf(item);
    if (found === null) return [];
    // Run k covers [start + k·period, start + (k+1)·period).
    const run = runAt(found.cycle, now);
    if (run < 0 || run >= itemRuns(found.cycle, found.membership)) return [];
    return [{ run, ...this.#span(found.cycle, run) }];
  }

  async _previousRun({ item, now }: { item: string; now: Date }): Promise<Array<{ run: number; start: Date; end: Date }>> {
    const found = await this.#membershipOf(item);
    if (found === null) return [];
    // The run before the current one, or the item's last run once it has ended.
    const run = Math.min(runAt(found.cycle, now), itemRuns(found.cycle, found.membership)) - 1;
    if (run < 0) return [];
    return [{ run, ...this.#span(found.cycle, run) }];
  }

  async _run({ item, run }: { item: string; run: number }): Promise<Array<{ start: Date; end: Date }>> {
    const found = await this.#membershipOf(item);
    if (found === null || !Number.isInteger(run) || run < 0 || run >= itemRuns(found.cycle, found.membership)) return [];
    return [this.#span(found.cycle, run)];
  }

  async _overlapping({ start, period, runs, except }: { start: Date; period: number; runs: number; except: string }): Promise<
    Array<{ cycle: string }>
  > {
    const begins = new Date(start).getTime();
    const end = begins + runs * period;
    const rows = await this.cycles
      .find({ _id: { $ne: except }, period, runs, start: { $lt: new Date(end) } })
      .sort({ start: 1, _id: 1 })
      .toArray();
    return rows.filter((c) => c.start.getTime() + c.runs * c.period > begins).map((c) => ({ cycle: c._id }));
  }

  async _all(_input: Record<string, never>): Promise<Row[]> {
    const rows = await this.cycles.find().sort({ start: 1, _id: 1 }).toArray();
    return rows.map(({ _id, start, period, runs }) => ({ cycle: _id, start, period, runs }));
  }

  async _items({ cycle }: { cycle: string }): Promise<Array<{ item: string; itemRuns: number }>> {
    const found = await this.cycles.findOne({ _id: cycle });
    if (found === null) return [];
    const rows = await this.memberships.find({ cycle }).sort({ _id: 1 }).toArray();
    return rows.map((m) => ({ item: m._id, itemRuns: itemRuns(found, m) }));
  }

  #span(cycle: Cycle, run: number) {
    const start = new Date(cycle.start.getTime() + run * cycle.period);
    return { start, end: new Date(start.getTime() + cycle.period) };
  }

  async #membershipOf(item: string): Promise<{ cycle: Cycle; membership: Membership } | null> {
    const membership = await this.memberships.findOne({ _id: item });
    if (membership === null) return null;
    const cycle = await this.cycles.findOne({ _id: membership.cycle });
    return cycle === null ? null : { cycle, membership };
  }
}
