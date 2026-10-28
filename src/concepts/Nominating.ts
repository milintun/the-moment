import { MongoServerError, type Collection, type Db } from "mongodb";

export class NameTaken extends Error {} // 409 conflict
export class NoSuchCategory extends Error {} // 404
export class InvalidName extends Error {} // 400
export class TooSoon extends Error {} // 409 conflict
export class NoSuchNomination extends Error {} // 404
export class NotNominator extends Error {} // 403 forbidden
export class Chosen extends Error {} // 409 conflict

const DAY = 24 * 60 * 60 * 1000;
const MAX_NAME = 40; // characters, after trimming

interface Category {
  _id: string;
  name: string;
}

interface Nomination {
  _id: string;
  nominator: string;
  category: string;
  name: string; // as written
  normalized: string; // for equivalence
  createdAt: Date;
  chosenAt?: Date; // set once the idea is chosen to become a gallery
}

interface Nominator {
  _id: string; // the user
  lastNominatedAt: Date;
}

// Names are equivalent when they match after trimming, collapsing inner spaces, and ignoring case.
function normalize(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export class NominatingConcept {
  private readonly categories: Collection<Category>;
  private readonly nominations: Collection<Nomination>;
  private readonly nominators: Collection<Nominator>;
  private indexed = false;

  constructor(db: Db) {
    this.categories = db.collection<Category>("nominating.categories");
    this.nominations = db.collection<Nomination>("nominating.nominations");
    this.nominators = db.collection<Nominator>("nominating.nominators");
  }

  async createCategory({ name }: { name: string }): Promise<{ category: string }> {
    if (!this.indexed) {
      // The unique index stops two categories from sharing a name.
      await this.categories.createIndex({ name: 1 }, { unique: true });
      this.indexed = true;
    }
    const category = crypto.randomUUID();
    try {
      await this.categories.insertOne({ _id: category, name });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new NameTaken("A category with this name already exists.");
      }
      throw error;
    }
    return { category };
  }

  async nominate({ nominator, category, name, createdAt }: {
    nominator: string;
    category: string;
    name: string;
    createdAt: Date;
  }): Promise<{ nomination: string }> {
    if ((await this.categories.findOne({ _id: category })) === null) {
      throw new NoSuchCategory("There is no such category.");
    }
    const normalized = normalize(name);
    if (normalized === "" || name.trim().length > MAX_NAME) {
      throw new InvalidName("A nomination needs a name of at most 40 characters.");
    }
    try {
      // Claims today's nomination in one step: updates lastNominatedAt only when it is at
      // least a day old, and otherwise the upsert collides with the existing _id.
      await this.nominators.updateOne(
        { _id: nominator, lastNominatedAt: { $lte: new Date(createdAt.getTime() - DAY) } },
        { $set: { lastNominatedAt: createdAt } },
        { upsert: true },
      );
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new TooSoon("You can nominate once a day.");
      }
      throw error;
    }
    const nomination = crypto.randomUUID();
    await this.nominations.insertOne({ _id: nomination, nominator, category, name, normalized, createdAt });
    return { nomination };
  }

  async withdraw({ nominator, nomination }: { nominator: string; nomination: string }): Promise<Record<string, never>> {
    const found = await this.nominations.findOne({ _id: nomination });
    if (found === null) throw new NoSuchNomination("There is no such nomination.");
    if (found.nominator !== nominator) throw new NotNominator("Only the nominator can withdraw a nomination.");
    if (found.chosenAt) throw new Chosen("A chosen nomination can't be withdrawn.");
    await this.nominations.deleteOne({ _id: nomination });
    // Give back the day it used: the last nomination is now the latest one left. With none left,
    // the record goes (rather than losing its time, which the daily claim in nominate relies on).
    const [latest] = await this.nominations.find({ nominator }).sort({ createdAt: -1 }).limit(1).toArray();
    if (latest) await this.nominators.updateOne({ _id: nominator }, { $set: { lastNominatedAt: latest.createdAt } });
    else await this.nominators.deleteOne({ _id: nominator });
    return {};
  }

  async choose({ nominations, chosenAt }: { nominations: string[]; chosenAt: Date }): Promise<Record<string, never>> {
    const found = await this.nominations.find({ _id: { $in: nominations } }).toArray();
    if (found.length !== new Set(nominations).size) throw new NoSuchNomination("There is no such nomination.");
    if (found.length !== nominations.length || found.some((n) => n.chosenAt)) {
      throw new Chosen("This nomination has already been chosen.");
    }
    await this.nominations.updateMany({ _id: { $in: nominations } }, { $set: { chosenAt } });
    return {};
  }

  async _categories(_input: Record<string, never>): Promise<Array<{ category: string; name: string }>> {
    const rows = await this.categories.find().sort({ name: 1 }).toArray();
    return rows.map(({ _id, name }) => ({ category: _id, name }));
  }

  async _category({ category }: { category: string }): Promise<Array<{ name: string }>> {
    const found = await this.categories.findOne({ _id: category });
    return found === null ? [] : [{ name: found.name }];
  }

  async _nominations({ category }: { category: string }): Promise<
    Array<{ nomination: string; nominator: string; name: string; createdAt: Date; chosen: boolean }>
  > {
    const rows = await this.nominations.find({ category }).sort({ createdAt: -1, _id: 1 }).toArray();
    return rows.map(({ _id, nominator, name, createdAt, chosenAt }) => ({ nomination: _id, nominator, name, createdAt, chosen: !!chosenAt }));
  }

  async _equivalent({ category, name }: { category: string; name: string }): Promise<
    Array<{ nomination: string; createdAt: Date }>
  > {
    const rows = await this.nominations
      .find({ category, normalized: normalize(name) })
      .sort({ createdAt: -1, _id: 1 })
      .toArray();
    return rows.map(({ _id, createdAt }) => ({ nomination: _id, createdAt }));
  }

  async _byNominator({ nominator }: { nominator: string }): Promise<
    Array<{ nomination: string; category: string; name: string; createdAt: Date; chosen: boolean }>
  > {
    const rows = await this.nominations.find({ nominator }).sort({ createdAt: -1, _id: 1 }).toArray();
    return rows.map(({ _id, category, name, createdAt, chosenAt }) => ({ nomination: _id, category, name, createdAt, chosen: !!chosenAt }));
  }

  async _unavailable({ nominations }: { nominations: string[] }): Promise<Array<{ nomination: string }>> {
    const free = new Set(
      (await this.nominations.find({ _id: { $in: nominations }, chosenAt: { $exists: false } }).toArray()).map((n) => n._id),
    );
    const seen = new Set<string>();
    const unavailable = nominations.filter((n) => {
      const repeat = seen.has(n);
      seen.add(n);
      return repeat || !free.has(n);
    });
    return [...new Set(unavailable)].map((nomination) => ({ nomination }));
  }

  async _get({ nomination }: { nomination: string }): Promise<
    Array<{ nominator: string; category: string; name: string; createdAt: Date; chosen: boolean }>
  > {
    const found = await this.nominations.findOne({ _id: nomination });
    if (found === null) return [];
    const { nominator, category, name, createdAt, chosenAt } = found;
    return [{ nominator, category, name, createdAt, chosen: !!chosenAt }];
  }
}
