import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidCycle extends Error {} // 400
export class AlreadyCycling extends Error {} // 409 conflict
export class NoSuchCycle extends Error {} // 404

interface Cycle {
  _id: string;
  item: string;
  start: Date;
  period: number; // milliseconds
  runs: number;
}

export class CyclingConcept {
  private readonly cycles: Collection<Cycle>;
  private indexed = false;

  constructor(db: Db) {
    this.cycles = db.collection<Cycle>("cycling.cycles");
  }

  async create({ item, start, period, runs }: { item: string; start: Date; period: number; runs: number }): Promise<{ cycle: string }> {
    if (!(period > 0) || !Number.isFinite(period) || !Number.isInteger(runs) || runs < 1) {
      throw new InvalidCycle("A cycle needs a positive period and at least one run.");
    }
    if (!this.indexed) {
      // The unique index allows at most one cycle per item.
      await this.cycles.createIndex({ item: 1 }, { unique: true });
      this.indexed = true;
    }
    const cycle = crypto.randomUUID();
    try {
      await this.cycles.insertOne({ _id: cycle, item, start, period, runs });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AlreadyCycling("This item already has a cycle.");
      }
      throw error;
    }
    return { cycle };
  }

  async delete({ cycle }: { cycle: string }): Promise<Record<string, never>> {
    const { deletedCount } = await this.cycles.deleteOne({ _id: cycle });
    if (deletedCount === 0) throw new NoSuchCycle("There is no such cycle.");
    return {};
  }

  async _cycle({ item }: { item: string }): Promise<Array<{ cycle: string; start: Date; period: number; runs: number }>> {
    const found = await this.cycles.findOne({ item });
    if (found === null) return [];
    return [{ cycle: found._id, start: found.start, period: found.period, runs: found.runs }];
  }

  async _currentRun({ item, now }: { item: string; now: Date }): Promise<Array<{ run: number; start: Date; end: Date }>> {
    const found = await this.cycles.findOne({ item });
    if (found === null) return [];
    const elapsed = now.getTime() - found.start.getTime();
    if (elapsed < 0) return []; // not started yet
    // Run k covers [start + k·period, start + (k+1)·period).
    const run = Math.floor(elapsed / found.period);
    if (run >= found.runs) return []; // every run has ended
    const start = new Date(found.start.getTime() + run * found.period);
    return [{ run, start, end: new Date(start.getTime() + found.period) }];
  }
}
