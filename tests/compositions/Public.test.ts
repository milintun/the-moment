import { beforeEach, describe, expect, test } from "bun:test";
import { createCycle, ok, openCategory, openGroup, setUpPeople, useApp, type Sessions } from "../app.ts";
import { HOUR, MINUTE, T0, at } from "../helpers.ts";

const app = useApp();
let people: Sessions;
let cycle: string; // 1-hour runs, 3 of them, starting at T0
beforeEach(async () => {
  people = await setUpPeople(app.api);
  cycle = await createCycle(app.api, people.milin, HOUR, 3);
});

const post = async (session: string, group: string, content: string) =>
  ok(await app.api.posts.create({ session, group, content })).post;
const feed = async (group: string) => ok(await app.api.groups.feed({ group })).feed.posts;

describe("groups/list", () => {
  test("each group with its cycle and current run, and blanks for a group with no cycle", async () => {
    const doodles = await openGroup(app.api, people.milin, "Doodles", cycle);
    const { group: wings } = ok(await app.api.admin.groups.create({ session: people.milin, name: "Wings" }));
    expect(await app.api.groups.list({})).toEqual({
      list: {
        groups: [
          {
            group: doodles,
            name: "Doodles",
            cycle,
            start: T0.toISOString(),
            period: HOUR,
            runs: 3,
            run: 0,
            runStart: T0.toISOString(),
            runEnd: at(HOUR).toISOString(),
          },
          {
            group: wings,
            name: "Wings",
            cycle: null,
            start: null,
            period: null,
            runs: null,
            run: null,
            runStart: null,
            runEnd: null,
          },
        ],
      },
    });
  });
});

describe("groups/feed", () => {
  let group: string;
  beforeEach(async () => {
    group = await openGroup(app.api, people.milin, "Doodles", cycle);
  });

  test("shows only the current run's posts", async () => {
    await post(people.gigi, group, "old");
    app.clock.advance(HOUR);
    await post(people.sid, group, "new");
    expect((await feed(group)).map((p) => p.content)).toEqual(["new"]);
  });

  test("each post carries its caption, empty when it has none", async () => {
    ok(await app.api.posts.create({ session: people.gigi, group, content: "a", caption: "Morning light" }));
    app.clock.advance(MINUTE);
    await post(people.sid, group, "b");
    expect((await feed(group)).map((p) => [p.content, p.caption])).toEqual([
      ["b", ""],
      ["a", "Morning light"],
    ]);
  });

  test("ranks by votes, newest first among ties", async () => {
    const first = await post(people.gigi, group, "first");
    app.clock.advance(MINUTE);
    const second = await post(people.sid, group, "second");
    app.clock.advance(MINUTE);
    const third = await post(people.sasha, group, "third");
    ok(await app.api.posts.vote({ session: people.milin, post: first }));
    expect((await feed(group)).map((p) => [p.post, p.votes])).toEqual([
      [first, 1],
      [third, 0],
      [second, 0],
    ]);
  });

  test("is empty for a closed group", async () => {
    await post(people.gigi, group, "x");
    app.clock.advance(3 * HOUR);
    expect(await feed(group)).toEqual([]);
  });
});

describe("posts/get", () => {
  test("details with the vote count, still readable after leaving every group", async () => {
    const group = await openGroup(app.api, people.milin, "Doodles", cycle);
    const { post: p } = ok(
      await app.api.posts.create({ session: people.gigi, group, content: "https://img/hands.png", caption: "Hands" }),
    );
    ok(await app.api.posts.vote({ session: people.sid, post: p }));
    const expected = {
      post: {
        post: p,
        owner: "gigi",
        content: "https://img/hands.png",
        caption: "Hands",
        createdAt: T0.toISOString(),
        votes: 1,
      },
    };
    expect(await app.api.posts.get({ post: p })).toEqual(expected);
    ok(await app.api.admin.groups["remove-post"]({ session: people.milin, group, post: p }));
    expect(await app.api.posts.get({ post: p })).toEqual(expected);
  });

  test("refuses NO_SUCH_POST", async () => {
    expect(await app.api.posts.get({ post: "unknown" })).toEqual({ error: "NO_SUCH_POST" });
  });
});

describe("nominations/categories", () => {
  test("each category with its current round, blank when closed", async () => {
    const open = await openCategory(app.api, people.milin, "Future galleries", cycle);
    const { category: closed } = ok(
      await app.api.admin.categories.create({ session: people.milin, name: "Future wings" }),
    );
    expect(await app.api.nominations.categories({})).toEqual({
      list: {
        categories: [
          { category: open, name: "Future galleries", run: 0, runStart: T0.toISOString(), runEnd: at(HOUR).toISOString() },
          { category: closed, name: "Future wings", run: null, runStart: null, runEnd: null },
        ],
      },
    });
  });
});

describe("nominations/list", () => {
  let category: string;
  beforeEach(async () => {
    category = await openCategory(app.api, people.milin, "Future galleries", cycle);
  });
  const ranking = async () => ok(await app.api.nominations.list({ category })).ranking.nominations;
  const nominate = async (session: string, name: string) =>
    ok(await app.api.nominations.create({ session, category, name })).nomination;

  test("ranks the current round by votes, newest first among ties", async () => {
    const hands = await nominate(people.gigi, "Hands");
    app.clock.advance(MINUTE);
    const feet = await nominate(people.sid, "Feet");
    app.clock.advance(MINUTE);
    const rain = await nominate(people.sasha, "Rain");
    ok(await app.api.nominations.vote({ session: people.milin, nomination: hands }));
    expect((await ranking()).map((n) => [n.nomination, n.votes])).toEqual([
      [hands, 1],
      [rain, 0],
      [feet, 0],
    ]);
    expect((await ranking())[0]).toEqual({
      nomination: hands,
      nominator: "gigi",
      name: "Hands",
      createdAt: T0.toISOString(),
      votes: 1,
    });
  });

  test("leaves earlier rounds out", async () => {
    await nominate(people.gigi, "Hands");
    app.clock.advance(HOUR);
    expect(await ranking()).toEqual([]);
  });

  test("is empty when the category is closed", async () => {
    await nominate(people.gigi, "Hands");
    app.clock.advance(3 * HOUR);
    expect(await app.api.nominations.list({ category })).toEqual({ ranking: { nominations: [] } });
  });
});
