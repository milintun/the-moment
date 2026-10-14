import { MongoServerError, type Collection, type Db } from "mongodb";

export class AlreadyVoted extends Error {} // 409 conflict
export class NotVoted extends Error {} // 404

interface Vote {
  voter: string;
  target: string;
}

export class UpvotingConcept {
  private readonly votes: Collection<Vote>;
  private indexed = false;
  
  constructor(db: Db) {
    this.votes = db.collection<Vote>("upvoting.votes");
  }

  async upvote({voter, target}: {voter: string, target: string}) {
    if (!this.indexed) {
      // use indices to ensure unique voter + target 
      await this.votes.createIndex({ voter: 1, target: 1 }, { unique: true });
      this.indexed = true;
    }
    try {
      await this.votes.insertOne({ voter, target });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AlreadyVoted("You have already upvoted this.");
      }
      throw error;
    }
    return {};
  }

  async unvote({voter, target}: {voter: string, target: string}) {
    const { deletedCount }  = await this.votes.deleteOne({ voter, target });
    if (deletedCount === 0) throw new NotVoted("You have not upvoted this.");
    return {};
  }

  async clear({ target }: { target: string }): Promise<Record<string, never>> {
    await this.votes.deleteMany({ target });
    return {};
  }

  async _count({target} : {target: string}) {
    return { votes: await this.votes.countDocuments({target}) };
  }

  async _voted({voter, target} : {voter: string, target: string}) {
    return { voted: (await this.votes.findOne({voter, target})) !== null };
  }

  async _counts(): Promise<Array<{ target: string; votes: number }>> {
    return this.votes.aggregate<{ target: string; votes: number }>([
      { $group: { _id: "$target", votes: { $sum: 1 } } },      // GROUP BY target, COUNT(*) AS votes
      { $sort: { votes: -1, _id: 1 } },                         // most votes first, ties by target
      { $project: { _id: 0, target: "$_id", votes: 1 } },       // rename _id → target, drop _id
    ]).toArray();
  }

}
