import { MongoServerError, type Collection, type Db } from "mongodb";

export class NameTaken extends Error {} // 409 conflict
export class NoSuchGroup extends Error {} // 404
export class AlreadyInGroup extends Error {} // 409 conflict
export class NotInGroup extends Error {} // 404

interface Group {
  _id: string;
  name: string;
  createdAt?: Date; // absent on groups made before creation times were recorded
}

// One record per item in a group, so a group's items can be read by when they were added
// (one season's posts) without reading the group's whole history.
interface Membership {
  _id: string; // `${group}|${item}`, so an item is in a group at most once
  group: string;
  item: string;
  addedAt: Date;
}

const membershipId = (group: string, item: string) => `${group}|${item}`;

export class GroupingConcept {
  private readonly groups: Collection<Group>;
  private readonly memberships: Collection<Membership>;
  private indexed = false;

  constructor(db: Db) {
    this.groups = db.collection<Group>("grouping.groups");
    this.memberships = db.collection<Membership>("grouping.memberships");
  }

  async #ensureIndexes() {
    if (this.indexed) return;
    // Unique names, and fast reads of a group's items by time and of an item's groups.
    await this.groups.createIndex({ name: 1 }, { unique: true });
    await this.memberships.createIndex({ group: 1, addedAt: -1 });
    await this.memberships.createIndex({ item: 1 });
    this.indexed = true;
  }

  async create({ name, createdAt }: { name: string; createdAt: Date }): Promise<{ group: string }> {
    await this.#ensureIndexes();
    const group = crypto.randomUUID();
    try {
      await this.groups.insertOne({ _id: group, name, createdAt });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new NameTaken("A group with this name already exists.");
      }
      throw error;
    }
    return { group };
  }

  async delete({ group }: { group: string }): Promise<Record<string, never>> {
    const { deletedCount } = await this.groups.deleteOne({ _id: group });
    if (deletedCount === 0) throw new NoSuchGroup("There is no such group.");
    await this.memberships.deleteMany({ group });
    return {};
  }

  async addItem({ group, item, addedAt }: { group: string; item: string; addedAt: Date }): Promise<Record<string, never>> {
    await this.#ensureIndexes();
    if ((await this.groups.findOne({ _id: group })) === null) throw new NoSuchGroup("There is no such group.");
    try {
      await this.memberships.insertOne({ _id: membershipId(group, item), group, item, addedAt });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AlreadyInGroup("This item is already in the group.");
      }
      throw error;
    }
    return {};
  }

  async removeItem({ group, item }: { group: string; item: string }): Promise<Record<string, never>> {
    if ((await this.groups.findOne({ _id: group })) === null) throw new NoSuchGroup("There is no such group.");
    const { deletedCount } = await this.memberships.deleteOne({ _id: membershipId(group, item) });
    if (deletedCount === 0) throw new NotInGroup("This item is not in the group.");
    return {};
  }

  async _groups(_input: Record<string, never>): Promise<Array<{ group: string; name: string }>> {
    const rows = await this.groups.find().sort({ createdAt: 1, name: 1 }).toArray();
    return rows.map(({ _id, name }) => ({ group: _id, name }));
  }

  async _page({ offset, limit }: { offset: number; limit: number }): Promise<Array<{ group: string; name: string }>> {
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1) return [];
    const rows = await this.groups.find().sort({ createdAt: 1, name: 1 }).skip(offset).limit(limit).toArray();
    return rows.map(({ _id, name }) => ({ group: _id, name }));
  }

  async _get({ group }: { group: string }): Promise<Array<{ name: string }>> {
    const found = await this.groups.findOne({ _id: group });
    return found === null ? [] : [{ name: found.name }];
  }

  async _items({ group }: { group: string }): Promise<Array<{ item: string }>> {
    const rows = await this.memberships.find({ group }).sort({ addedAt: -1, _id: -1 }).toArray();
    return rows.map(({ item }) => ({ item }));
  }

  async _itemsAdded({ group, from, to }: { group: string; from: Date; to: Date }): Promise<
    Array<{ item: string; addedAt: Date }>
  > {
    const rows = await this.memberships
      .find({ group, addedAt: { $gte: from, $lt: to } })
      .sort({ addedAt: -1, _id: -1 })
      .toArray();
    return rows.map(({ item, addedAt }) => ({ item, addedAt }));
  }

  async _groupsOf({ item }: { item: string }): Promise<Array<{ group: string }>> {
    const rows = await this.memberships.find({ item }).sort({ group: 1 }).toArray();
    return rows.map(({ group }) => ({ group }));
  }

  async _byName({ name }: { name: string }): Promise<Array<{ group: string }>> {
    const found = await this.groups.findOne({ name });
    return found === null ? [] : [{ group: found._id }];
  }
}
