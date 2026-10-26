// Adds galleries whose seasons are already over, so the archive has something in it.
//
//   bun scripts/seed-archive.ts
//
// The app can only start cycles and date posts "now", so this writes the past through the
// concepts directly (like scripts/set-owner.ts). Images are real uploads in storage, and posts
// and votes are ordinary records, so the archive shows them exactly like real history.
// Galleries that already exist are skipped, so running it twice adds nothing.
import { client, db } from "../src/db.ts";
import { AuthenticatingConcept } from "../src/concepts/Authenticating.ts";
import { CyclingConcept } from "../src/concepts/Cycling.ts";
import { GroupingConcept } from "../src/concepts/Grouping.ts";
import { PostingConcept } from "../src/concepts/Posting.ts";
import { UploadingConcept } from "../src/concepts/Uploading.ts";
import { UpvotingConcept } from "../src/concepts/Upvoting.ts";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

const PEOPLE = ["gigi", "sid", "sash"]; // created with password123 if missing
const IMAGES = [
  "https://i.pinimg.com/1200x/7a/c3/8b/7ac38b11c3f76092e3b35d415e9363b5.jpg",
  "https://i.pinimg.com/1200x/22/53/e3/2253e3d2f9bcb9f4a424596a06330b14.jpg",
  "https://i.pinimg.com/736x/ed/be/03/edbe032e22b71640245aa8c2467d9acb.jpg",
  "https://i.pinimg.com/736x/28/cd/f5/28cdf5990d8316a1457679b3b61e84bb.jpg",
  "https://i.pinimg.com/736x/ec/86/0c/ec860c090756c02d09b8d579158cb33a.jpg",
  "https://i.pinimg.com/736x/d8/9c/cd/d89ccd2da14edc4fc0fd6238b27f413c.jpg",
];
const CAPTIONS = ["first try", "", "from the window", "late night", "", "after class", "rough sketch", "", "kept this one"];

// Past cycles, each with the galleries it held. Every season of these has ended.
const PAST = [
  { start: now - 6 * 7 * DAY, period: 7 * DAY, runs: 3, galleries: ["Self Portraits", "Night Walks"] }, // ended 3 weeks ago
  { start: now - 100 * DAY, period: 30 * DAY, runs: 2, galleries: ["Still Life"] }, // a wing; ended 40 days ago
];

const auth = new AuthenticatingConcept(db);
const cycling = new CyclingConcept(db);
const grouping = new GroupingConcept(db);
const posting = new PostingConcept(db);
const uploading = new UploadingConcept(db);
const upvoting = new UpvotingConcept(db);

try {
  for (const username of PEOPLE) {
    if (!(await auth._registered({ username })).registered) await auth.register({ username, password: "password123" });
  }

  console.log("Downloading images…");
  const images = await Promise.all(
    IMAGES.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`download ${url} failed: ${response.status}`);
      return { bytes: await response.arrayBuffer(), type: response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg" };
    }),
  );

  let made = 0;
  let counter = 0;
  for (const past of PAST) {
    const todo = [];
    for (const name of past.galleries) {
      if ((await grouping._byName({ name })).length) console.log(`${name} already exists, skipped.`);
      else todo.push(name);
    }
    if (!todo.length) continue;

    const start = new Date(past.start);
    const { cycle } = await cycling.create({ start, period: past.period, runs: past.runs });
    for (const name of todo) {
      const { group } = await grouping.create({ name, createdAt: start });
      await cycling.addItem({ cycle, item: group });
      for (let season = 0; season < past.runs; season++) {
        for (let i = 0; i < 3; i++) {
          const owner = PEOPLE[(i + season) % PEOPLE.length]!;
          const createdAt = new Date(past.start + season * past.period + ((i + 1) * past.period) / 5);
          const image = images[counter % images.length]!;
          const { upload, uploadUrl } = await uploading.requestUpload({ owner, contentType: image.type, createdAt });
          const sent = await fetch(uploadUrl, { method: "PUT", body: image.bytes, headers: { "Content-Type": image.type } });
          if (!sent.ok) throw new Error(`storing an image failed: ${sent.status}`);
          const { post } = await posting.create({ owner, content: upload, caption: CAPTIONS[counter % CAPTIONS.length]!, createdAt });
          await grouping.addItem({ group, item: post, addedAt: createdAt });
          // A different number of votes on each post (2, 1, 0), never from its owner.
          for (const voter of PEOPLE.filter((p) => p !== owner).slice(0, 2 - i)) {
            await upvoting.upvote({ voter, target: post });
          }
          counter++;
        }
      }
      made++;
      console.log(`${name}: ${past.runs} past seasons of ${past.period / DAY} days, 3 posts each.`);
    }
  }
  console.log(made ? `Added ${made} archived galleries.` : "Nothing to add.");
} finally {
  await client.close();
}
