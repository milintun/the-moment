import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidCycle extends Error {} // 400
export class AlreadyCycling extends Error {} // 409 conflict
export class NoSuchCycle extends Error {} // 404
export class NotInCycle extends Error {} // 404

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
}

function validRuns(runs: number): boolean {
  return Number.isInteger(runs) && runs >= 1;
}

export class CyclingConcept {
  private readonly cycles: Collection<Cycle>;
  private readonly memberships: Collection<Membership>;

  constructor(db: Db) {
    this.cycles = db.collection<Cycle>("cycling.cycles");
    this.memberships = db.collection<Membership>("cycling.memberships");
  }

  async create({ start, period, runs }: { start: Date; period: number; runs: number }): Promise<{ cycle: string }> {
    if (!(period > 0) || !Number.isFinite(period) || !validRuns(runs)) {
      throw new InvalidCycle("A cycle needs a positive period and at least one run.");
    }
    const cycle = crypto.randomUUID();
    await this.cycles.insertOne({ _id: cycle, start, period, runs });
    return { cycle };
  }

  async addItem({ cycle, item }: { cycle: string; item: string }): Promise<Record<string, never>> {
    if ((await this.cycles.findOne({ _id: cycle })) === null) throw new NoSuchCycle("There is no such cycle.");
    try {
      await this.memberships.insertOne({ _id: item, cycle });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AlreadyCycling("This item already belongs to a cycle.");
      }
      throw error;
    }
    return {};
  }

  async removeItem({ cycle, item }: { cycle: string; item: string }): Promise<Record<string, never>> {
    if ((await this.cycles.findOne({ _id: cycle })) === null) throw new NoSuchCycle("There is no such cycle.");
    const { deletedCount } = await this.memberships.deleteOne({ _id: item, cycle });
    if (deletedCount === 0) throw new NotInCycle("This item is not in the cycle.");
    return {};
  }

  async setRuns({ cycle, runs }: { cycle: string; runs: number }): Promise<Record<string, never>> {
    if (!validRuns(runs)) throw new InvalidCycle("A cycle needs a positive period and at least one run.");
    const { matchedCount } = await this.cycles.updateOne({ _id: cycle }, { $set: { runs } });
    if (matchedCount === 0) throw new NoSuchCycle("There is no such cycle.");
    return {};
  }

  async delete({ cycle }: { cycle: string }): Promise<Record<string, never>> {
    const { deletedCount } = await this.cycles.deleteOne({ _id: cycle });
    if (deletedCount === 0) throw new NoSuchCycle("There is no such cycle.");
    await this.memberships.deleteMany({ cycle });
    return {};
  }

  async _cycle({ item }: { item: string }): Promise<Array<{ cycle: string; start: Date; period: number; runs: number }>> {
    const found = await this.#cycleOf(item);
    if (found === null) return [];
    return [{ cycle: found._id, start: found.start, period: found.period, runs: found.runs }];
  }

  async _currentRun({ item, now }: { item: string; now: Date }): Promise<Array<{ run: number; start: Date; end: Date }>> {
    const found = await this.#cycleOf(item);
    if (found === null) return [];
    const elapsed = now.getTime() - found.start.getTime();
    if (elapsed < 0) return []; // not started yet
    // Run k covers [start + k·period, start + (k+1)·period).
    const run = Math.floor(elapsed / found.period);
    if (run >= found.runs) return []; // every run has ended
    const start = new Date(found.start.getTime() + run * found.period);
    return [{ run, start, end: new Date(start.getTime() + found.period) }];
  }

  async _previousRun({ item, now }: { item: string; now: Date }): Promise<Array<{ run: number; start: Date; end: Date }>> {
    const found = await this.#cycleOf(item);
    if (found === null) return [];
    const elapsed = now.getTime() - found.start.getTime();
    if (elapsed < 0) return []; // not started yet
    // The run before the current one, or the last run once every run has ended.
    const run = Math.min(Math.floor(elapsed / found.period), found.runs) - 1;
    if (run < 0) return []; // still in the first run
    const start = new Date(found.start.getTime() + run * found.period);
    return [{ run, start, end: new Date(start.getTime() + found.period) }];
  }

  async _all(_input: Record<string, never>): Promise<Array<{ cycle: string; start: Date; period: number; runs: number }>> {
    const rows = await this.cycles.find().sort({ start: 1, _id: 1 }).toArray();
    return rows.map(({ _id, start, period, runs }) => ({ cycle: _id, start, period, runs }));
  }

  async _items({ cycle }: { cycle: string }): Promise<Array<{ item: string }>> {
    const rows = await this.memberships.find({ cycle }).sort({ _id: 1 }).toArray();
    return rows.map(({ _id }) => ({ item: _id }));
  }

  async #cycleOf(item: string): Promise<Cycle | null> {
    const membership = await this.memberships.findOne({ _id: item });
    return membership === null ? null : this.cycles.findOne({ _id: membership.cycle });
  }
}
