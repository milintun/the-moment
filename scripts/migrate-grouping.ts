// One-time migration: Grouping used to keep each group's items as an array inside the group;
// it now keeps one membership per item with the time it was added. This moves old arrays
// into memberships, using each post's creation time as when it was added (the group's own
// creation time, or now, if that is unknown). Safe to run more than once.
//
//   bun scripts/migrate-grouping.ts
//
// Uses MONGODB_URL from .env; point it elsewhere like scripts/set-owner.ts describes.
import { client, db } from "../src/db.ts";

type OldGroup = { _id: string; items?: string[]; createdAt?: Date };

try {
  const groups = db.collection<OldGroup>("grouping.groups");
  const memberships = db.collection<{ _id: string; group: string; item: string; addedAt: Date }>("grouping.memberships");
  const posts = db.collection<{ _id: string; createdAt: Date }>("posting.posts");
  let moved = 0;
  for (const group of await groups.find({ items: { $exists: true } }).toArray()) {
    for (const item of group.items ?? []) {
      const post = await posts.findOne({ _id: item });
      const addedAt = post?.createdAt ?? group.createdAt ?? new Date();
      const result = await memberships.updateOne(
        { _id: `${group._id}|${item}` },
        { $setOnInsert: { group: group._id, item, addedAt } },
        { upsert: true },
      );
      if (result.upsertedCount) moved++;
    }
    await groups.updateOne({ _id: group._id }, { $unset: { items: "" } });
  }
  console.log(`Moved ${moved} item(s) into memberships.`);
} finally {
  await client.close();
}
