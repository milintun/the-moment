import { type Collection, type Db } from "mongodb";

export class NoSuchPost extends Error {} // 404
export class NotOwner extends Error {} // forbidden

interface Post {
  _id: string;
  owner: string;
  content: string;
  createdAt: Date;
}

export class PostingConcept {
  private readonly posts: Collection<Post>;
  
  constructor(db: Db) {
    this.posts = db.collection<Post>("posting.posts");
  }

  async create({owner, content, createdAt}: {owner: string, content: string, createdAt: Date}) {
    const post = crypto.randomUUID();
    await this.posts.insertOne({ _id: post, owner, content, createdAt });
    return { post };
  }

  async delete({user, post}: {user: string, post: string}) {
    const doc = await (this.posts.findOne({ _id: post }));
    if (doc === null) throw new NoSuchPost("There is no such post.");
    if (doc.owner !== user) throw new NotOwner("Only the owner of a post can delete it.");
    await this.posts.deleteOne({ _id: post });
    return {};
  }

  async _get({post}: {post: string}) {
    const doc = await (this.posts.findOne({ _id: post }));
    return (doc === null) ? [] : [{owner: doc.owner, content: doc.content, createdAt: doc.createdAt}];
  }

}
