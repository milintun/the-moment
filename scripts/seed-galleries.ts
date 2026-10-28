// Adds three open galleries, mid-season, so gallery pages have something to show: two whose
// season just started (one a wing) and one whose season ends soon. Each has posts and votes.
//
//   bun scripts/seed-galleries.ts
//
// The app only starts seasons "now", so a season already under way is written through the
// concepts directly (like scripts/seed-archive.ts). Images are real uploads in storage.
// A gallery that already exists gets topped up to TOTAL posts instead, so running it twice
// adds nothing more.
import { client, db } from "../src/db.ts";
import { AuthenticatingConcept } from "../src/concepts/Authenticating.ts";
import { CyclingConcept } from "../src/concepts/Cycling.ts";
import { GroupingConcept } from "../src/concepts/Grouping.ts";
import { PostingConcept } from "../src/concepts/Posting.ts";
import { UploadingConcept } from "../src/concepts/Uploading.ts";
import { UpvotingConcept } from "../src/concepts/Upvoting.ts";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();

const PEOPLE = ["gigi", "sid", "sash", "ada", "bob", "cyd", "dee", "eli"]; // created with password123 if missing
const CAPTIONS = ["first try", "", "from the window", "late night", "", "after class", "rough sketch", "kept this one"];
const POSTS_EACH = 6;
const TOTAL = 13; // what an existing gallery is topped up to
// [width, height] of each picture in turn, for a mix of shapes: wide, square, tall, panorama.
const SIZES: Array<[number, number]> = [
  [800, 1000],
  [1200, 600],
  [900, 900],
  [600, 1000],
  [1000, 700],
  [1400, 500],
  [700, 1200],
];

// Each gallery's own schedule, set so its current season is where the name says.
const GALLERIES = [
  { name: "Kitchen Still Lifes", start: now - 2 * HOUR, period: 7 * DAY, runs: 4 }, // just started
  { name: "Windows", start: now - 5 * HOUR, period: 30 * DAY, runs: 3 }, // a wing, just started
  { name: "Hands", start: now - 7 * DAY + 8 * HOUR, period: 7 * DAY, runs: 3 }, // ends in 8 hours
];

const auth = new AuthenticatingConcept(db);
const cycling = new CyclingConcept(db);
const grouping = new GroupingConcept(db);
const posting = new PostingConcept(db);
const uploading = new UploadingConcept(db);
const upvoting = new UpvotingConcept(db);

/** A photo from picsum.photos, the same one every time for the same seed, in one of SIZES. */
async function image(seed: string, i: number) {
  const [w, h] = SIZES[i % SIZES.length]!;
  const response = await fetch(`https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`);
  if (!response.ok) throw new Error(`downloading an image failed: ${response.status}`);
  return { bytes: await response.arrayBuffer(), type: response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg" };
}

try {
  for (const username of PEOPLE) {
    if (!(await auth._registered({ username })).registered) await auth.register({ username, password: "password123" });
  }

  /** Hangs `count` posts in `group`, spread from `from` until now, numbered from `first`. */
  async function hang(name: string, group: string, from: number, first: number, count: number) {
    for (let i = first; i < first + count; i++) {
      const owner = PEOPLE[i % PEOPLE.length]!;
      const createdAt = new Date(from + ((i - first + 1) * (Date.now() - from)) / (count + 1));
      const picture = await image(`${name}-${i}`, i);
      const { upload, uploadUrl } = await uploading.requestUpload({ owner, contentType: picture.type, createdAt });
      const sent = await fetch(uploadUrl, { method: "PUT", body: picture.bytes, headers: { "Content-Type": picture.type } });
      if (!sent.ok) throw new Error(`storing an image failed: ${sent.status}`);
      const { post } = await posting.create({ owner, content: upload, caption: CAPTIONS[i % CAPTIONS.length]!, createdAt });
      await grouping.addItem({ group, item: post, addedAt: createdAt });
      // Fewer votes down the wall (5, 4, 3, …), never from the post's owner.
      for (const voter of PEOPLE.filter((p) => p !== owner).slice(0, Math.max(0, 5 - (i % 6)))) {
        await upvoting.upvote({ voter, target: post });
      }
    }
  }

  for (const g of GALLERIES) {
    const [existing] = await grouping._byName({ name: g.name });
    if (existing) {
      const have = (await grouping._items({ group: existing.group })).length;
      if (have >= TOTAL) {
        console.log(`${g.name} already has ${have} posts, skipped.`);
        continue;
      }
      // New posts go after the latest one, so they land in the season under way.
      await hang(g.name, existing.group, Date.now() - HOUR, have, TOTAL - have);
      console.log(`${g.name}: topped up with ${TOTAL - have} posts.`);
      continue;
    }
    const start = new Date(g.start);
    const { cycle } = await cycling.create({ start, period: g.period, runs: g.runs, earliest: start });
    const { group } = await grouping.create({ name: g.name, createdAt: start });
    await cycling.addItem({ cycle, item: group });
    await hang(g.name, group, g.start, 0, POSTS_EACH);
    console.log(`${g.name}: ${g.period / DAY}-day seasons, ${POSTS_EACH} posts with votes.`);
  }
} finally {
  await client.close();
}
