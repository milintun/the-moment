// Fills a fresh database with dummy groups, a cycle, users, posts, and votes,
// going through the real API so every rule applies. Each post's image is downloaded from
// its URL and uploaded through the app, exactly as a person posting it would.
//
//   ADMIN_PASSWORD=... bun scripts/seed.ts [http://127.0.0.1:8080]
//
// milin must already be registered and made the owner (scripts/set-owner.ts).
// Running it twice creates a second cycle and
// duplicate posts, so reset the database first if you want a clean slate.
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { TheMomentWireHttp } from "../generated/wire.ts";

const address = process.argv[2] ?? "http://127.0.0.1:8080";
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) throw new Error("Set ADMIN_PASSWORD to milin's password.");

const DAY = 24 * 60 * 60 * 1000;
const CYCLE = { period: 7 * DAY, runs: 1 }; // one week-long season
const GROUPS = ["Figure Drawing", "Doodles"];
const USERS = ["gigi", "sid", "sash"]; // all get DUMMY_PASSWORD
const DUMMY_PASSWORD = "password123";

// [owner, group, image URL to download, caption ("" for none)].
const POSTS: Array<[string, string, string, string]> = [
  ["gigi", "Figure Drawing", "https://i.pinimg.com/1200x/7a/c3/8b/7ac38b11c3f76092e3b35d415e9363b5.jpg", "Quick gesture study"],
  ["sid", "Figure Drawing", "https://i.pinimg.com/1200x/22/53/e3/2253e3d2f9bcb9f4a424596a06330b14.jpg", ""],
  ["sash", "Figure Drawing", "https://i.pinimg.com/736x/ed/be/03/edbe032e22b71640245aa8c2467d9acb.jpg", "Someone reading in the park"],
  ["gigi", "Doodles", "https://i.pinimg.com/736x/28/cd/f5/28cdf5990d8316a1457679b3b61e84bb.jpg", "Margin doodle from lecture"],
  ["sid", "Doodles", "https://i.pinimg.com/736x/ec/86/0c/ec860c090756c02d09b8d579158cb33a.jpg", ""],
  ["sash", "Doodles", "https://i.pinimg.com/736x/d8/9c/cd/d89ccd2da14edc4fc0fd6238b27f413c.jpg", "Cat, again"],
];
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

// A client that keeps its own session cookie, like one browser would.
function clientFor() {
  let cookie = "";
  return createHttpClient<TheMomentWireHttp>({
    baseUrl: `${address}/api`,
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (cookie) headers.set("Cookie", cookie);
      const response = await fetch(input, { ...init, headers });
      const set = response.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0]!;
      return response;
    }) as typeof fetch,
  });
}

// Stop on the first failure so a half-seeded database is obvious.
function ok<T extends object>(step: string, result: T): Exclude<T, { error: unknown }> {
  if ("error" in result) throw new Error(`${step} failed: ${String(result.error)}`);
  return result as Exclude<T, { error: unknown }>;
}

/** Downloads an image and uploads it through the app as `client`'s user, returning the upload. */
async function uploadFrom(client: ReturnType<typeof clientFor>, url: string): Promise<string> {
  const download = await fetch(url);
  if (!download.ok) throw new Error(`download ${url} failed: ${download.status}`);
  const contentType = download.headers.get("content-type")?.split(";")[0] ?? "";
  if (!ACCEPTED.includes(contentType)) throw new Error(`${url} is ${contentType || "unknown type"}, not an accepted image`);
  const { upload, uploadUrl } = ok("request upload", await client.uploads.request({ contentType }));
  const sent = await fetch(uploadUrl, { method: "PUT", body: await download.arrayBuffer(), headers: { "Content-Type": contentType } });
  if (!sent.ok) throw new Error(`storing ${url} failed: ${sent.status}`);
  return upload;
}

const admin = clientFor();
ok("milin sign-in", await admin.auth["sign-in"]({ username: "milin", password: adminPassword }));

const groupIds = new Map<string, string>();
for (const name of GROUPS) {
  groupIds.set(name, ok(`create group ${name}`, await admin.admin.groups.create({ name })).group);
}
const { cycle } = ok("create cycle", await admin.admin.cycles.create(CYCLE));
for (const [name, group] of groupIds) {
  ok(`add ${name} to cycle`, await admin.admin.cycles["add-item"]({ cycle, item: group }));
}
console.log(`Created ${GROUPS.join(" and ")} in a ${CYCLE.period / DAY}-day cycle.`);

const users = new Map<string, ReturnType<typeof clientFor>>();
for (const username of USERS) {
  const client = clientFor();
  ok(`register ${username}`, await client.auth.register({ username, password: DUMMY_PASSWORD }));
  users.set(username, client);
}

const posts: Array<{ post: string; owner: string }> = [];
for (const [owner, group, url, caption] of POSTS) {
  const client = users.get(owner)!;
  const content = await uploadFrom(client, url);
  const { post } = ok(`${owner} posts`, await client.posts.create({ group: groupIds.get(group)!, content, caption }));
  posts.push({ post, owner });
}
console.log(`Created ${posts.length} posts by ${USERS.join(", ")}.`);

// Each user upvotes every other post they don't own, so vote counts differ.
let votes = 0;
for (const [index, username] of USERS.entries()) {
  for (const [i, { post, owner }] of posts.entries()) {
    if (owner === username || (i + index) % 2 === 1) continue;
    ok(`${username} votes`, await users.get(username)!.posts.vote({ post }));
    votes++;
  }
}
console.log(`Cast ${votes} votes. Done.`);
