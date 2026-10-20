import { type Collection, type Db } from "mongodb";

export class NoSuchPost extends Error {} // 404
export class NotOwner extends Error {} // forbidden

interface Post {
  _id: string;
  owner: string;
  content: string;
  caption: string; // "" when the post has none
  createdAt: Date;
}

export class PostingConcept {
  private readonly posts: Collection<Post>;
  
  constructor(db: Db) {
    this.posts = db.collection<Post>("posting.posts");
  }

  async create({owner, content, caption, createdAt}: {owner: string, content: string, caption: string, createdAt: Date}) {
    const post = crypto.randomUUID();
    // Trimming makes a caption of only spaces empty, which means no caption.
    await this.posts.insertOne({ _id: post, owner, content, caption: caption.trim(), createdAt });
    return { post };
  }

  async delete({user, post}: {user: string, post: string}) {
    const doc = await (this.posts.findOne({ _id: post }));
    if (doc === null) throw new NoSuchPost("There is no such post.");
    if (doc.owner !== user) throw new NotOwner("Only the owner of a post can delete it.");
    await this.posts.deleteOne({ _id: post });
    return { content: doc.content };
  }

  async _byOwner({ owner }: { owner: string }): Promise<
    Array<{ post: string; content: string; caption: string; createdAt: Date }>
  > {
    const rows = await this.posts.find({ owner }).sort({ createdAt: -1, _id: 1 }).toArray();
    return rows.map(({ _id, content, caption, createdAt }) => ({ post: _id, content, caption: caption ?? "", createdAt }));
  }

  async _get({post}: {post: string}) {
    const doc = await (this.posts.findOne({ _id: post }));
    // Posts made before captions existed have no caption field.
    return (doc === null) ? [] : [{owner: doc.owner, content: doc.content, caption: doc.caption ?? "", createdAt: doc.createdAt}];
  }

}
