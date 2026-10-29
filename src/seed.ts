// A believable history for a fresh deployment, from seed.data.ts: dummy users, archived and
// current galleries and wings, upcoming schedules, posts with votes, and past and current
// Future galleries rounds whose winners became those galleries.
//
// It wipes the database first. Two ways to run it:
//   - Locally: bun scripts/seed-prod.ts --reset   (uses MONGODB_URL and S3_* from .env)
//   - On the platform: set SEED_RESET=yes and redeploy. The app seeds itself once at startup
//     (a marker stops it repeating), then remove the variable.
// Dummy accounts get random passwords that are never shown, so nobody can sign in as them.
//
// The app only dates things "now", so the past is written through the concepts directly.
// Images are downloaded from their sources (seed.images.json) and uploaded like any post.
import type { Db } from "mongodb";
import { AuthenticatingConcept } from "./concepts/Authenticating.ts";
import { CyclingConcept } from "./concepts/Cycling.ts";
import { GroupingConcept } from "./concepts/Grouping.ts";
import { NominatingConcept } from "./concepts/Nominating.ts";
import { PostingConcept } from "./concepts/Posting.ts";
import { UploadingConcept } from "./concepts/Uploading.ts";
import { UpvotingConcept } from "./concepts/Upvoting.ts";
import { FUTURE_GALLERIES, ensureFutureGalleries } from "./nominations.ts";
import { CAPTIONS, CURRENT_IDEAS, GALLERIES, PAST_IDEAS, UPCOMING, USERS } from "./seed.data.ts";
import IMAGES from "./seed.images.json" with { type: "json" };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** 12am EST (05:00 UTC) on a date like "2026-10-26". */
const monday = (date: string) => new Date(`${date}T05:00:00Z`).getTime();
const MARKER = "seed.marker";

/** Seeds once per database: does nothing if this database was already seeded. */
export async function seedOnce(db: Db): Promise<void> {
  if (await db.collection(MARKER).findOne({})) {
    console.log("SEED_RESET is set, but this database was already seeded; nothing changed. Remove SEED_RESET.");
    return;
  }
  await seed(db);
}

export async function seed(db: Db): Promise<void> {
  const now = Date.now();
  // Rounds close Mondays at 12am EST (see nominations.ts); this week's opened on the last one.
  const roundStart = monday("2026-01-05") + Math.floor((now - monday("2026-01-05")) / (7 * DAY)) * 7 * DAY;

  // A fixed random sequence, so the same data seeds the same history every time.
  let state = 20261029;
  const random = () => ((state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const shuffled = <T>(list: readonly T[]) => [...list].sort(() => random() - 0.5);
  /** Mostly a few votes, now and then many: what a real wall looks like. */
  const skewedVotes = (most: number) => Math.floor(random() ** 2.5 * most);

  const auth = new AuthenticatingConcept(db);
  const cycling = new CyclingConcept(db);
  const grouping = new GroupingConcept(db);
  const nominating = new NominatingConcept(db);
  const posting = new PostingConcept(db);
  const uploading = new UploadingConcept(db);
  const upvoting = new UpvotingConcept(db);
  const nominationVotes = new UpvotingConcept(db, "nominationvotes.votes");
  const vote = async (votes: UpvotingConcept, target: string, count: number, except: string) => {
    for (const voter of shuffled(USERS.filter((u) => u !== except)).slice(0, count)) await votes.upvote({ voter, target });
  };

  console.log(`Seeding: resetting ${db.databaseName}…`);
  await db.dropDatabase();
  await ensureFutureGalleries(db);
  const category = (await nominating._categories({})).find((c) => c.name === FUTURE_GALLERIES)!.category;

  for (const username of USERS) await auth.register({ username, password: crypto.randomUUID() });
  console.log(`Seeding: ${USERS.length} users.`);

  // Schedules: galleries opening together on the same terms share a cycle, as the admin page makes them.
  type Schedule = { start: number; days: number; seasons: number; names: string[] };
  const schedules = new Map<string, Schedule>();
  for (const g of [...GALLERIES, ...UPCOMING.flatMap((u) => u.names.map((name) => ({ ...u, name })))]) {
    const key = `${g.start}|${g.days}|${g.seasons}`;
    const s = schedules.get(key) ?? { start: monday(g.start), days: g.days, seasons: g.seasons, names: [] };
    s.names.push(g.name);
    schedules.set(key, s);
  }
  const groups = new Map<string, string>(); // gallery name → group
  for (const s of schedules.values()) {
    const createdAt = new Date(Math.min(s.start - 2 * DAY, now)); // set up the weekend before
    const { cycle } = await cycling.create({ start: new Date(s.start), period: s.days * DAY, runs: s.seasons, earliest: createdAt });
    const { groups: made } = await grouping.createMany({ names: s.names, createdAt });
    await cycling.addItems({ cycle, items: made });
    s.names.forEach((name, i) => groups.set(name, made[i]!));
  }
  console.log(`Seeding: ${groups.size} galleries and wings in ${schedules.size} schedules.`);

  // Posts: spread over every season that has begun, never in the future. A source that fails to
  // download is skipped for the next candidate.
  let posted = 0;
  for (const g of GALLERIES) {
    const candidates = shuffled((IMAGES as Record<string, Array<{ url: string }>>)[g.name] ?? []);
    const start = monday(g.start);
    const period = g.days * DAY;
    const begun = Math.min(g.seasons, Math.ceil((now - start) / period));
    let count = 0;
    for (const { url } of candidates) {
      if (count >= g.posts) break;
      let bytes: ArrayBuffer;
      let type: string;
      try {
        const res = await fetch(url, { headers: { "User-Agent": "the-moment-seed" }, signal: AbortSignal.timeout(60_000) });
        type = res.headers.get("content-type")?.split(";")[0] ?? "";
        if (!res.ok || !type.startsWith("image/")) continue;
        bytes = await res.arrayBuffer();
      } catch {
        continue;
      }
      const from = start + (count % begun) * period;
      const to = Math.min(from + period, now - HOUR);
      const createdAt = new Date(from + random() * (to - from));
      const owner = pick(USERS);
      const { upload, uploadUrl } = await uploading.requestUpload({ owner, contentType: type, createdAt });
      const sent = await fetch(uploadUrl, { method: "PUT", body: bytes, headers: { "Content-Type": type } });
      if (!sent.ok) throw new Error(`storing an image failed: ${sent.status}`);
      const { post } = await posting.create({ owner, content: upload, caption: pick(CAPTIONS), createdAt });
      await grouping.addItem({ group: groups.get(g.name)!, item: post, addedAt: createdAt });
      await vote(upvoting, post, skewedVotes(USERS.length - 1), owner);
      count++;
    }
    posted += count;
    console.log(`Seeding:   ${g.name}: ${count} posts`);
  }

  // Future galleries rounds, oldest first (once a day per person holds because each round's
  // ideas come from different people, between Tuesday and Saturday). A schedule's galleries won
  // the round that closed as it opened, or for one not open yet, the last round to close.
  const opened = new Map<number, string[]>(); // a round's closing Monday → the galleries it chose
  for (const s of schedules.values()) {
    const close = Math.min(s.start, roundStart);
    opened.set(close, [...(opened.get(close) ?? []), ...s.names]);
  }
  const ideas = shuffled(PAST_IDEAS);
  let nominations = 0;
  for (const close of [...opened.keys()].sort()) {
    const winners = opened.get(close)!.map((name) => name.toLowerCase());
    const losers = Array.from({ length: 4 + Math.floor(random() * 5) }, () => ideas.pop() ?? pick(PAST_IDEAS)).filter((n) => !winners.includes(n));
    const people = shuffled(USERS);
    const chosen: string[] = [];
    for (const [i, name] of [...winners, ...losers].entries()) {
      const createdAt = new Date(close - 6 * DAY + random() * 4 * DAY);
      const nominator = people[i]!;
      const { nomination } = await nominating.nominate({ nominator, category, name, createdAt });
      // Winners lead their round.
      await vote(nominationVotes, nomination, i < winners.length ? 12 + Math.floor(random() * 12) : skewedVotes(11), nominator);
      if (i < winners.length) chosen.push(nomination);
      nominations++;
    }
    await nominating.choose({ nominations: chosen, chosenAt: new Date(Math.min(close + HOUR, now)) });
  }
  // This week's round, still open: ideas from earlier this week, up to now.
  const people = shuffled(USERS);
  for (const [i, name] of CURRENT_IDEAS.entries()) {
    const createdAt = new Date(roundStart + HOUR + random() * (now - roundStart - 2 * HOUR));
    const nominator = people[i]!;
    const { nomination } = await nominating.nominate({ nominator, category, name, createdAt });
    await vote(nominationVotes, nomination, skewedVotes(16), nominator);
    nominations++;
  }

  await db.collection(MARKER).insertOne({ seededAt: new Date() });
  console.log(`Seeding done: ${posted} posts, ${nominations} nominations across ${opened.size + 1} rounds.`);
}
