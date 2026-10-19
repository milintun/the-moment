import { MongoServerError, type Collection, type Db } from "mongodb";

export class NameTaken extends Error {} // 409 conflict
export class NoSuchGroup extends Error {} // 404
export class AlreadyInGroup extends Error {} // 409 conflict
export class NotInGroup extends Error {} // 404

interface Group {
  _id: string;
  name: string;
  items: string[];
}

export class GroupingConcept {
  private readonly groups: Collection<Group>;
  private indexed = false;

  constructor(db: Db) {
    this.groups = db.collection<Group>("grouping.groups");
  }

  async create({ name }: { name: string }): Promise<{ group: string }> {
    if (!this.indexed) {
      // The unique index stops two groups from sharing a name.
      await this.groups.createIndex({ name: 1 }, { unique: true });
      this.indexed = true;
    }
    const group = crypto.randomUUID();
    try {
      await this.groups.insertOne({ _id: group, name, items: [] });
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
    return {};
  }

  async addItem({ group, item }: { group: string; item: string }): Promise<Record<string, never>> {
    // $addToSet adds item only if it isn't already in the array.
    const { matchedCount, modifiedCount } = await this.groups.updateOne(
      { _id: group },
      { $addToSet: { items: item } },
    );
    if (matchedCount === 0) throw new NoSuchGroup("There is no such group.");
    if (modifiedCount === 0) throw new AlreadyInGroup("This item is already in the group.");
    return {};
  }

  async removeItem({ group, item }: { group: string; item: string }): Promise<Record<string, never>> {
    // $pull removes item from the array; nothing changes if it wasn't there.
    const { matchedCount, modifiedCount } = await this.groups.updateOne(
      { _id: group },
      { $pull: { items: item } },
    );
    if (matchedCount === 0) throw new NoSuchGroup("There is no such group.");
    if (modifiedCount === 0) throw new NotInGroup("This item is not in the group.");
    return {};
  }

  async _groups(_input: Record<string, never>): Promise<Array<{ group: string; name: string }>> {
    const rows = await this.groups.find().sort({ name: 1 }).toArray();
    return rows.map(({ _id, name }) => ({ group: _id, name }));
  }

  async _get({ group }: { group: string }): Promise<Array<{ name: string }>> {
    const found = await this.groups.findOne({ _id: group });
    return found === null ? [] : [{ name: found.name }];
  }

  async _items({ group }: { group: string }): Promise<Array<{ item: string }>> {
    const found = await this.groups.findOne({ _id: group });
    if (found === null) return [];
    // $addToSet appends, so reversing the array gives the most recently added first.
    return [...found.items].reverse().map((item) => ({ item }));
  }

  async _groupsOf({ item }: { item: string }): Promise<Array<{ group: string }>> {
    const rows = await this.groups.find({ items: item }).sort({ _id: 1 }).toArray();
    return rows.map(({ _id }) => ({ group: _id }));
  }

  async _byName({ name }: { name: string }): Promise<Array<{ group: string }>> {
    const found = await this.groups.findOne({ name });
    return found === null ? [] : [{ group: found._id }];
  }
}
