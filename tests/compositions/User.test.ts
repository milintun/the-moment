import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../../src/db.ts";
import { S3Client } from "bun";
import {
  createCategory,
  createCycle,
  ok,
  openCategory,
  openGroup,
  setUpPeople,
  signUp,
  uploadImage,
  useApp,
  type Sessions,
} from "../app.ts";
import { HOUR, MINUTE } from "../helpers.ts";

const app = useApp();
let people: Sessions;
let cycle: string; // 1-hour runs, 3 of them, starting now
let group: string; // "Doodles", open
beforeEach(async () => {
  people = await setUpPeople(app.api);
  cycle = await createCycle(app.api, people.milin, HOUR, 3);
  group = await openGroup(app.api, people.milin, "Doodles", cycle);
});

const count = (collection: string) => db.collection(collection).countDocuments();
const votesOf = async (post: string) => ok(await app.api.posts.get({ post })).post?.votes;
const post = async (who: string, into = group) =>
  ok(await app.api.posts.create({ session: who, group: into, content: await uploadImage(app.api, who) })).post;
const stored = (upload: string) => new S3Client().file(`uploads/${upload}`).exists();

describe("auth", () => {
  test("register returns the account and a session", async () => {
    const result = ok(await app.api.auth.register({ username: "newbie", password: "password123" }));
    expect(result.account).toBe("newbie");
    expect(typeof result.session).toBe("string");
  });

  test("current returns the username, and sign-out ends the session", async () => {
    expect(await app.api.auth.current({ session: people.gigi })).toEqual({ username: "gigi" });
    expect(await app.api.auth["sign-out"]({ session: people.gigi })).toEqual({ signedOut: true });
    expect(await app.api.auth.current({ session: people.gigi })).toEqual({ error: "UNKNOWN_SESSION" });
  });

  test("sign-in refuses INVALID_CREDENTIALS for a wrong password and accepts the right one", async () => {
    expect(await app.api.auth["sign-in"]({ username: "gigi", password: "wrong-pass" })).toEqual({
      error: "INVALID_CREDENTIALS",
    });
    expect(ok(await app.api.auth["sign-in"]({ username: "gigi", password: "password123" })).account).toBe("gigi");
  });

  test("registering twice refuses USERNAME_TAKEN", async () => {
    expect(await app.api.auth.register({ username: "gigi", password: "password123" })).toEqual({
      error: "USERNAME_TAKEN",
    });
  });
});

describe("uploads/request", () => {
  test("an accepted image type gets a new upload and a link that accepts the file", async () => {
    const { upload, uploadUrl } = ok(await app.api.uploads.request({ session: people.gigi, contentType: "image/webp" }));
    expect(typeof upload).toBe("string");
    const sent = await fetch(uploadUrl, { method: "PUT", body: new Uint8Array(10), headers: { "Content-Type": "image/webp" } });
    expect(sent.ok).toBe(true);
    expect(await stored(upload)).toBe(true);
  });

  test("every accepted image type is allowed", async () => {
    for (const contentType of ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]) {
      expect("upload" in (await app.api.uploads.request({ session: people.gigi, contentType }))).toBe(true);
    }
  });

  test("refuses UNSUPPORTED_TYPE for other types and records no upload", async () => {
    for (const contentType of ["image/gif", "image/heic", "application/pdf"]) {
      expect(await app.api.uploads.request({ session: people.gigi, contentType })).toEqual({ error: "UNSUPPORTED_TYPE" });
    }
    expect(await count("uploading.uploads")).toBe(0);
  });

  test("refuses UNKNOWN_SESSION without an active session", async () => {
    expect(await app.api.uploads.request({ session: "invented", contentType: "image/png" })).toEqual({
      error: "UNKNOWN_SESSION",
    });
  });
});

describe("posts/create", () => {
  test("posting an uploaded image into an open group adds the post to its feed", async () => {
    const image = await uploadImage(app.api, people.gigi);
    const { post: p } = ok(await app.api.posts.create({ session: people.gigi, group, content: image }));
    const feed = ok(await app.api.groups.feed({ group })).feed.posts;
    expect(feed.map((f) => [f.post, f.content, f.owner])).toEqual([[p, image, "gigi"]]);
  });

  test("a caption is optional, trimmed, and only spaces means none", async () => {
    const captioned = async (caption?: string) => {
      const content = await uploadImage(app.api, people.gigi);
      const input = caption === undefined ? { session: people.gigi, group, content } : { session: people.gigi, group, content, caption };
      const { post: p } = ok(await app.api.posts.create(input));
      return ok(await app.api.posts.get({ post: p })).post?.caption;
    };
    expect(await captioned("  A quiet morning  ")).toBe("A quiet morning");
    expect(await captioned()).toBe("");
    expect(await captioned("    ")).toBe("");
  });

  test("refuses NO_SUCH_UPLOAD for something that is not an upload, creating nothing", async () => {
    expect(await app.api.posts.create({ session: people.gigi, group, content: "https://img/x.png" })).toEqual({
      error: "NO_SUCH_UPLOAD",
    });
    expect(await count("posting.posts")).toBe(0);
  });

  test("refuses NOT_YOUR_UPLOAD for someone else's upload, creating nothing", async () => {
    const sids = await uploadImage(app.api, people.sid);
    expect(await app.api.posts.create({ session: people.gigi, group, content: sids })).toEqual({
      error: "NOT_YOUR_UPLOAD",
    });
    expect(await count("posting.posts")).toBe(0);
    expect(await stored(sids)).toBe(true);
  });

  test("refuses NOT_UPLOADED when the file never arrived, creating nothing", async () => {
    const { upload } = ok(await app.api.uploads.request({ session: people.gigi, contentType: "image/png" }));
    expect(await app.api.posts.create({ session: people.gigi, group, content: upload })).toEqual({
      error: "NOT_UPLOADED",
    });
    expect(await count("posting.posts")).toBe(0);
  });

  test("refuses INVALID_FILE over 10 MB, creating nothing and removing the file", async () => {
    const big = await uploadImage(app.api, people.gigi, { bytes: 10 * 1024 * 1024 + 1 });
    expect(await app.api.posts.create({ session: people.gigi, group, content: big })).toEqual({
      error: "INVALID_FILE",
    });
    expect(await count("posting.posts")).toBe(0);
    expect(await stored(big)).toBe(false);
  });

  test("accepts exactly 10 MB", async () => {
    const limit = await uploadImage(app.api, people.gigi, { bytes: 10 * 1024 * 1024 });
    ok(await app.api.posts.create({ session: people.gigi, group, content: limit }));
  });

  test("refuses INVALID_FILE when the file sent is not the requested type, removing it", async () => {
    const { upload, uploadUrl } = ok(await app.api.uploads.request({ session: people.gigi, contentType: "image/png" }));
    await fetch(uploadUrl, { method: "PUT", body: new Uint8Array(10), headers: { "Content-Type": "image/gif" } });
    expect(await app.api.posts.create({ session: people.gigi, group, content: upload })).toEqual({
      error: "INVALID_FILE",
    });
    expect(await stored(upload)).toBe(false);
  });

  test("refuses GROUP_CLOSED for a category's identifier and creates no post", async () => {
    const category = await openCategory(app.api, people.milin, "Future galleries", cycle);
    const content = await uploadImage(app.api, people.gigi);
    expect(await app.api.posts.create({ session: people.gigi, group: category, content })).toEqual({
      error: "GROUP_CLOSED",
    });
    expect(await count("posting.posts")).toBe(0);
  });

  test("refuses GROUP_CLOSED for a group with no cycle, and after the cycle ends", async () => {
    const { group: uncycled } = ok(await app.api.admin.groups.create({ session: people.milin, name: "Wings" }));
    const content = await uploadImage(app.api, people.gigi);
    expect(await app.api.posts.create({ session: people.gigi, group: uncycled, content })).toEqual({
      error: "GROUP_CLOSED",
    });
    app.clock.advance(3 * HOUR);
    expect(await app.api.posts.create({ session: people.gigi, group, content })).toEqual({
      error: "GROUP_CLOSED",
    });
    expect(await count("posting.posts")).toBe(0);
  });

  test("refuses UNKNOWN_SESSION without an active session", async () => {
    expect(await app.api.posts.create({ session: "invented", group, content: "x" })).toEqual({
      error: "UNKNOWN_SESSION",
    });
  });
});

describe("posts/delete", () => {
  test("the owner deletes: the post leaves its groups, its votes are cleared, and its image is removed", async () => {
    const image = await uploadImage(app.api, people.gigi);
    const { post: p } = ok(await app.api.posts.create({ session: people.gigi, group, content: image }));
    ok(await app.api.posts.vote({ session: people.sid, post: p }));
    expect(await app.api.posts.delete({ session: people.gigi, post: p })).toEqual({ post: p });
    expect(ok(await app.api.groups.feed({ group })).feed.posts).toEqual([]);
    expect(await count("upvoting.votes")).toBe(0);
    expect(await app.api.posts.get({ post: p })).toEqual({ error: "NO_SUCH_POST" });
    expect(await count("uploading.uploads")).toBe(0);
    expect(await stored(image)).toBe(false);
    expect(await app.api.images.link({ upload: image })).toEqual({ error: "NO_SUCH_UPLOAD" });
  });

  test("refuses NOT_OWNER for anyone else and nothing is removed", async () => {
    const image = await uploadImage(app.api, people.gigi);
    const { post: p } = ok(await app.api.posts.create({ session: people.gigi, group, content: image }));
    expect(await app.api.posts.delete({ session: people.sid, post: p })).toEqual({ error: "NOT_OWNER" });
    expect(await stored(image)).toBe(true);
    expect(ok(await app.api.groups.feed({ group })).feed.posts).toHaveLength(1);
  });
});

describe("posts/mine", () => {
  const mine = async (session = people.gigi) => ok(await app.api.posts.mine({ session })).mine.posts;

  test("lists your posts newest first with caption, time, votes, gallery, season, and current", async () => {
    const image = await uploadImage(app.api, people.gigi);
    const { post: first } = ok(await app.api.posts.create({ session: people.gigi, group, content: image, caption: "Hands" }));
    ok(await app.api.posts.vote({ session: people.sid, post: first }));
    app.clock.advance(MINUTE);
    const second = await post(people.gigi);
    await post(people.sid); // someone else's post is never listed
    expect(await mine()).toEqual([
      { post: second, content: expect.any(String), caption: "", createdAt: expect.any(String), votes: 0, galleries: [{ group, name: "Doodles", season: 0 }], current: true },
      { post: first, content: image, caption: "Hands", createdAt: expect.any(String), votes: 1, galleries: [{ group, name: "Doodles", season: 0 }], current: true },
    ]);
  });

  test("keeps the season a post was made in, and stops marking it current once the season ends", async () => {
    const early = await post(people.gigi);
    app.clock.advance(HOUR); // season 1 begins
    const later = await post(people.gigi);
    const rows = await mine();
    expect(rows.map((r) => [r.post, r.galleries[0]?.season, r.current])).toEqual([
      [later, 1, true],
      [early, 0, null],
    ]);
  });

  test("lists every gallery a post is in", async () => {
    const p = await post(people.gigi);
    const sketches = await openGroup(app.api, people.milin, "Sketches", cycle);
    ok(await app.api.admin.groups["add-post"]({ session: people.milin, group: sketches, post: p }));
    const galleries = (await mine())[0]?.galleries.map((g) => g.name).sort();
    expect(galleries).toEqual(["Doodles", "Sketches"]);
  });

  test("still lists a post whose gallery was deleted, with no galleries", async () => {
    const p = await post(people.gigi);
    ok(await app.api.admin.groups.delete({ session: people.milin, group }));
    expect((await mine()).map((r) => [r.post, r.galleries, r.current])).toEqual([[p, [], null]]);
  });

  test("is empty for someone with no posts, and refuses UNKNOWN_SESSION when signed out", async () => {
    expect(await mine(people.sasha)).toEqual([]);
    expect(await app.api.posts.mine({ session: "invented" })).toEqual({ error: "UNKNOWN_SESSION" });
  });
});

describe("posts/vote and posts/unvote", () => {
  test("allowed in season, then refuses ALREADY_VOTED and NOT_VOTED without changing counts", async () => {
    const p = await post(people.gigi);
    expect(await app.api.posts.vote({ session: people.sid, post: p })).toEqual({ post: p });
    expect(await app.api.posts.vote({ session: people.sid, post: p })).toEqual({ error: "ALREADY_VOTED" });
    expect(await votesOf(p)).toBe(1);
    expect(await app.api.posts.unvote({ session: people.sid, post: p })).toEqual({ post: p });
    expect(await app.api.posts.unvote({ session: people.sid, post: p })).toEqual({ error: "NOT_VOTED" });
    expect(await votesOf(p)).toBe(0);
  });

  test("refuses OWN_POST", async () => {
    const p = await post(people.gigi);
    expect(await app.api.posts.vote({ session: people.gigi, post: p })).toEqual({ error: "OWN_POST" });
    expect(await app.api.posts.unvote({ session: people.gigi, post: p })).toEqual({ error: "OWN_POST" });
    expect(await votesOf(p)).toBe(0);
  });

  test("refuses NOT_IN_SEASON once the run rolls over, keeping the vote", async () => {
    const p = await post(people.gigi);
    ok(await app.api.posts.vote({ session: people.sid, post: p }));
    app.clock.advance(HOUR);
    expect(await app.api.posts.vote({ session: people.sasha, post: p })).toEqual({ error: "NOT_IN_SEASON" });
    expect(await app.api.posts.unvote({ session: people.sid, post: p })).toEqual({ error: "NOT_IN_SEASON" });
    expect(await votesOf(p)).toBe(1);
  });

  test("refuses NO_SUCH_POST", async () => {
    expect(await app.api.posts.vote({ session: people.sid, post: "unknown" })).toEqual({ error: "NO_SUCH_POST" });
    expect(await app.api.posts.unvote({ session: people.sid, post: "unknown" })).toEqual({ error: "NO_SUCH_POST" });
  });
});

describe("posts/my-votes", () => {
  test("lists exactly the posts you upvoted in the group", async () => {
    const liked = await post(people.gigi);
    await post(people.sasha);
    ok(await app.api.posts.vote({ session: people.sid, post: liked }));
    expect(await app.api.posts["my-votes"]({ session: people.sid, group })).toEqual({
      votes: { posts: [{ post: liked }] },
    });
  });
});

describe("nominations/create", () => {
  let category: string;
  beforeEach(async () => {
    category = await openCategory(app.api, people.milin, "Future galleries", cycle);
  });
  const nominate = (session: string, name: string, into = category) =>
    app.api.nominations.create({ session, category: into, name });

  test("allowed in an open category and listed publicly", async () => {
    const { nomination } = ok(await nominate(people.gigi, "Hands"));
    const ranking = ok(await app.api.nominations.list({ category })).ranking.nominations;
    expect(ranking.map((n) => n.nomination)).toEqual([nomination]);
  });

  test("refuses ALREADY_NOMINATED for an equivalent name this round, then allows it next round", async () => {
    ok(await nominate(people.gigi, "Hands"));
    expect(await nominate(people.sid, "  HANDS ")).toEqual({ error: "ALREADY_NOMINATED" });
    expect(await count("nominating.nominations")).toBe(1);
    app.clock.advance(HOUR);
    ok(await nominate(people.sid, "hands"));
    expect(await count("nominating.nominations")).toBe(2);
  });

  test("refuses CATEGORY_CLOSED with no cycle and after the cycle ends", async () => {
    const uncycled = await createCategory("Future wings");
    expect(await nominate(people.gigi, "Oceans", uncycled)).toEqual({ error: "CATEGORY_CLOSED" });
    app.clock.advance(3 * HOUR);
    expect(await nominate(people.gigi, "Oceans")).toEqual({ error: "CATEGORY_CLOSED" });
    expect(await count("nominating.nominations")).toBe(0);
  });

  test("passes Nominating's TOO_SOON through", async () => {
    ok(await nominate(people.gigi, "Hands"));
    app.clock.advance(10 * MINUTE);
    expect(await nominate(people.gigi, "Feet")).toEqual({ error: "TOO_SOON" });
  });

  test("refuses NO_SUCH_CATEGORY for a group's identifier", async () => {
    expect(await nominate(people.gigi, "Hands", group)).toEqual({ error: "NO_SUCH_CATEGORY" });
  });
});

describe("nominations: withdraw, vote, unvote, my-votes", () => {
  let category: string;
  let hands: string;
  beforeEach(async () => {
    category = await openCategory(app.api, people.milin, "Future galleries", cycle);
    hands = ok(await app.api.nominations.create({ session: people.gigi, category, name: "Hands" })).nomination;
  });
  const votes = async () =>
    ok(await app.api.nominations.list({ category })).ranking.nominations.find((n) => n.nomination === hands)?.votes;

  test("the nominator withdraws and its votes are cleared", async () => {
    ok(await app.api.nominations.vote({ session: people.sid, nomination: hands }));
    expect(await app.api.nominations.withdraw({ session: people.gigi, nomination: hands })).toEqual({
      nomination: hands,
    });
    expect(ok(await app.api.nominations.list({ category })).ranking.nominations).toEqual([]);
    expect(await count("nominationvotes.votes")).toBe(0);
  });

  test("withdraw refuses NOT_NOMINATOR", async () => {
    expect(await app.api.nominations.withdraw({ session: people.sid, nomination: hands })).toEqual({
      error: "NOT_NOMINATOR",
    });
    expect(await count("nominating.nominations")).toBe(1);
  });

  test("vote and unvote are allowed while active", async () => {
    expect(await app.api.nominations.vote({ session: people.sid, nomination: hands })).toEqual({ nomination: hands });
    expect(await votes()).toBe(1);
    expect(await app.api.nominations.unvote({ session: people.sid, nomination: hands })).toEqual({
      nomination: hands,
    });
    expect(await votes()).toBe(0);
  });

  test("refuses OWN_NOMINATION", async () => {
    expect(await app.api.nominations.vote({ session: people.gigi, nomination: hands })).toEqual({
      error: "OWN_NOMINATION",
    });
    expect(await app.api.nominations.unvote({ session: people.gigi, nomination: hands })).toEqual({
      error: "OWN_NOMINATION",
    });
    expect(await votes()).toBe(0);
  });

  test("refuses NOT_ACTIVE once the round rolls over, keeping the vote", async () => {
    ok(await app.api.nominations.vote({ session: people.sid, nomination: hands }));
    app.clock.advance(HOUR);
    expect(await app.api.nominations.vote({ session: people.sasha, nomination: hands })).toEqual({
      error: "NOT_ACTIVE",
    });
    expect(await app.api.nominations.unvote({ session: people.sid, nomination: hands })).toEqual({
      error: "NOT_ACTIVE",
    });
    expect(await count("nominationvotes.votes")).toBe(1);
  });

  test("refuses NO_SUCH_NOMINATION", async () => {
    expect(await app.api.nominations.vote({ session: people.sid, nomination: "unknown" })).toEqual({
      error: "NO_SUCH_NOMINATION",
    });
    expect(await app.api.nominations.unvote({ session: people.sid, nomination: "unknown" })).toEqual({
      error: "NO_SUCH_NOMINATION",
    });
  });

  test("my-votes lists only active nominations you upvoted", async () => {
    ok(await app.api.nominations.vote({ session: people.sid, nomination: hands }));
    expect(await app.api.nominations["my-votes"]({ session: people.sid, category })).toEqual({
      votes: { nominations: [{ nomination: hands }] },
    });
    app.clock.advance(HOUR);
    expect(await app.api.nominations["my-votes"]({ session: people.sid, category })).toEqual({
      votes: { nominations: [] },
    });
  });
});

describe("sessions", () => {
  test("a freshly registered user can act right away", async () => {
    const session = await signUp(app.api, "newbie");
    ok(await app.api.posts.create({ session, group, content: await uploadImage(app.api, session) }));
  });
});
