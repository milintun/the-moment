import { MongoServerError, type Collection, type Db } from "mongodb";

export class OwnerExists extends Error {} // 409 conflict
export class AlreadyAdmin extends Error {} // 409 conflict
export class NotAdmin extends Error {} // 404
export class OwnerProtected extends Error {} // 403 forbidden

interface Admin {
  _id: string; // the user, so a user is an admin at most once
  owner: boolean;
}

export class AdministratingConcept {
  private readonly admins: Collection<Admin>;
  private indexed = false;

  constructor(db: Db) {
    this.admins = db.collection<Admin>("administrating.admins");
  }

  async setOwner({ user }: { user: string }): Promise<Record<string, never>> {
    if (!this.indexed) {
      // Only documents with owner: true are indexed, so at most one admin can be the owner.
      await this.admins.createIndex({ owner: 1 }, { unique: true, partialFilterExpression: { owner: true } });
      this.indexed = true;
    }
    try {
      // Makes user an admin if they aren't one, and marks them as the owner. Matching only a
      // non-owner record means an existing owner (this user or another) always collides:
      // with the user's own _id, or with the one-owner index.
      await this.admins.updateOne({ _id: user, owner: { $ne: true } }, { $set: { owner: true } }, { upsert: true });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new OwnerExists("The application already has an owner.");
      }
      throw error;
    }
    return {};
  }

  async addAdmin({ user }: { user: string }): Promise<Record<string, never>> {
    try {
      await this.admins.insertOne({ _id: user, owner: false });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AlreadyAdmin("This user is already an admin.");
      }
      throw error;
    }
    return {};
  }

  async removeAdmin({ user }: { user: string }): Promise<Record<string, never>> {
    const found = await this.admins.findOne({ _id: user });
    if (found === null) throw new NotAdmin("This user is not an admin.");
    if (found.owner) throw new OwnerProtected("The owner cannot be removed.");
    // The owner: false filter means this can never delete the owner, even in a race.
    const { deletedCount } = await this.admins.deleteOne({ _id: user, owner: false });
    if (deletedCount === 0) throw new NotAdmin("This user is not an admin.");
    return {};
  }

  async _isOwner({ user }: { user: string }): Promise<{ owner: boolean }> {
    return { owner: (await this.admins.findOne({ _id: user, owner: true })) !== null };
  }

  async _isAdmin({ user }: { user: string }): Promise<{ admin: boolean }> {
    return { admin: (await this.admins.findOne({ _id: user })) !== null };
  }

  async _admins(_input: Record<string, never>): Promise<Array<{ user: string; owner: boolean }>> {
    const rows = await this.admins.find().sort({ _id: 1 }).toArray();
    return rows.map(({ _id, owner }) => ({ user: _id, owner }));
  }
}
