import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../../src/db.ts";
import { createCycle, ok, openCategory, openGroup, setUpPeople, signUp, useApp, type Sessions } from "../app.ts";
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
const post = async (who: string, content = "https://img/x.png", into = group) =>
  ok(await app.api.posts.create({ session: who, group: into, content })).post;

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

describe("posts/create", () => {
  test("posting into an open group adds the post to its feed", async () => {
    const p = await post(people.gigi);
    const feed = ok(await app.api.groups.feed({ group })).feed.posts;
    expect(feed.map((f) => f.post)).toEqual([p]);
    expect(feed[0]?.owner).toBe("gigi");
  });

  test("refuses GROUP_CLOSED for a category's identifier and creates no post", async () => {
    const category = await openCategory(app.api, people.milin, "Future galleries", cycle);
    expect(await app.api.posts.create({ session: people.gigi, group: category, content: "x" })).toEqual({
      error: "GROUP_CLOSED",
    });
    expect(await count("posting.posts")).toBe(0);
  });

  test("refuses GROUP_CLOSED for a group with no cycle, and after the cycle ends", async () => {
    const { group: uncycled } = ok(await app.api.admin.groups.create({ session: people.milin, name: "Wings" }));
    expect(await app.api.posts.create({ session: people.gigi, group: uncycled, content: "x" })).toEqual({
      error: "GROUP_CLOSED",
    });
    app.clock.advance(3 * HOUR);
    expect(await app.api.posts.create({ session: people.gigi, group, content: "x" })).toEqual({
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
  test("the owner deletes: the post leaves its groups and its votes are cleared", async () => {
    const p = await post(people.gigi);
    ok(await app.api.posts.vote({ session: people.sid, post: p }));
    expect(await app.api.posts.delete({ session: people.gigi, post: p })).toEqual({ post: p });
    expect(ok(await app.api.groups.feed({ group })).feed.posts).toEqual([]);
    expect(await count("upvoting.votes")).toBe(0);
    expect(await app.api.posts.get({ post: p })).toEqual({ error: "NO_SUCH_POST" });
  });

  test("refuses NOT_OWNER for anyone else and nothing is removed", async () => {
    const p = await post(people.gigi);
    expect(await app.api.posts.delete({ session: people.sid, post: p })).toEqual({ error: "NOT_OWNER" });
    expect(ok(await app.api.groups.feed({ group })).feed.posts).toHaveLength(1);
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
    const liked = await post(people.gigi, "a");
    await post(people.sasha, "b");
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
    const { category: uncycled } = ok(
      await app.api.admin.categories.create({ session: people.milin, name: "Future wings" }),
    );
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
    ok(await app.api.posts.create({ session, group, content: "x" }));
  });
});
