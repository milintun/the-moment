// Fills a fresh database with dummy groups, a cycle, users, posts, and votes,
// going through the real API so every rule applies.
//
//   ADMIN_PASSWORD=... bun scripts/seed.ts [http://127.0.0.1:8080]
//
// milin must already be registered. Running it twice creates a second cycle and
// duplicate posts, so reset the database first if you want a clean slate.
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { TheMomentWireHttp } from "../generated/wire.ts";

const address = process.argv[2] ?? "http://127.0.0.1:8080";
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) throw new Error("Set ADMIN_PASSWORD to milin's password.");

const DAY = 24 * 60 * 60 * 1000;
const CYCLE = { period: 7 * DAY, runs: 1 }; // one week-long season
const GROUPS = ["Figure Drawing", "Doodles"];
const USERS = ["ari", "bea", "cam"]; // all get DUMMY_PASSWORD
const DUMMY_PASSWORD = "password123";

// Paste image URLs here: [owner, group, image URL].
const POSTS: Array<[string, string, string]> = [
  ["ari", "Figure Drawing", "PASTE_IMAGE_URL"],
  ["bea", "Figure Drawing", "PASTE_IMAGE_URL"],
  ["cam", "Figure Drawing", "PASTE_IMAGE_URL"],
  ["ari", "Doodles", "PASTE_IMAGE_URL"],
  ["bea", "Doodles", "PASTE_IMAGE_URL"],
  ["cam", "Doodles", "PASTE_IMAGE_URL"],
];

// A client that keeps its own session cookie, like one browser would.
function clientFor() {
  let cookie = "";
  return createHttpClient<TheMomentWireHttp>({
    baseUrl: `${address}/api`,
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (cookie) headers.set("Cookie", cookie);
      const response = await fetch(input, { ...init, headers });
      const set = response.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0]!;
      return response;
    },
  });
}

// Stop on the first failure so a half-seeded database is obvious.
function ok<T extends object>(step: string, result: T): Exclude<T, { error: unknown }> {
  if ("error" in result) throw new Error(`${step} failed: ${String(result.error)}`);
  return result as Exclude<T, { error: unknown }>;
}

if (POSTS.some(([, , url]) => url === "PASTE_IMAGE_URL")) throw new Error("Paste image URLs into POSTS first.");

const admin = clientFor();
ok("milin sign-in", await admin.auth["sign-in"]({ username: "milin", password: adminPassword }));

const groupIds = new Map<string, string>();
for (const name of GROUPS) {
  groupIds.set(name, ok(`create group ${name}`, await admin.admin.groups.create({ name })).group);
}
const { cycle } = ok("create cycle", await admin.admin.cycles.create(CYCLE));
for (const [name, group] of groupIds) {
  ok(`add ${name} to cycle`, await admin.admin.cycles["add-group"]({ cycle, group }));
}
console.log(`Created ${GROUPS.join(" and ")} in a ${CYCLE.period / DAY}-day cycle.`);

const users = new Map<string, ReturnType<typeof clientFor>>();
for (const username of USERS) {
  const client = clientFor();
  ok(`register ${username}`, await client.auth.register({ username, password: DUMMY_PASSWORD }));
  users.set(username, client);
}

const posts: Array<{ post: string; owner: string }> = [];
for (const [owner, group, content] of POSTS) {
  const { post } = ok(`${owner} posts`, await users.get(owner)!.posts.create({ group: groupIds.get(group)!, content }));
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
