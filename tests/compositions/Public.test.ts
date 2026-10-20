import { beforeEach, describe, expect, test } from "bun:test";
import { createCategory, createCycle, ok, openCategory, openGroup, setUpPeople, uploadImage, useApp, type Sessions } from "../app.ts";
import { HOUR, MINUTE, T0, at } from "../helpers.ts";

const app = useApp();
let people: Sessions;
let cycle: string; // 1-hour runs, 3 of them, starting at T0
beforeEach(async () => {
  people = await setUpPeople(app.api);
  cycle = await createCycle(app.api, people.milin, HOUR, 3);
});

// Posts an uploaded image, labelled by its caption so tests can tell posts apart.
const post = async (session: string, group: string, caption: string) =>
  ok(await app.api.posts.create({ session, group, content: await uploadImage(app.api, session), caption })).post;
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
    expect((await feed(group)).map((p) => p.caption)).toEqual(["new"]);
  });

  test("each post carries its caption, empty when it has none", async () => {
    const captioned = await post(people.gigi, group, "Morning light");
    app.clock.advance(MINUTE);
    const plain = ok(
      await app.api.posts.create({ session: people.sid, group, content: await uploadImage(app.api, people.sid) }),
    ).post;
    expect((await feed(group)).map((p) => [p.post, p.caption])).toEqual([
      [plain, ""],
      [captioned, "Morning light"],
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
    const image = await uploadImage(app.api, people.gigi);
    const { post: p } = ok(await app.api.posts.create({ session: people.gigi, group, content: image, caption: "Hands" }));
    ok(await app.api.posts.vote({ session: people.sid, post: p }));
    const expected = {
      post: {
        post: p,
        owner: "gigi",
        content: image,
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

describe("groups/archive", () => {
  let group: string;
  beforeEach(async () => {
    group = await openGroup(app.api, people.milin, "Doodles", cycle);
  });
  const archive = (season: number, into = group) => app.api.groups.archive({ group: into, season });

  test("a finished season shows its posts with final votes, most first and newest first on ties", async () => {
    const first = await post(people.gigi, group, "first");
    app.clock.advance(MINUTE);
    const second = await post(people.sid, group, "second");
    app.clock.advance(MINUTE);
    const third = await post(people.sasha, group, "third");
    ok(await app.api.posts.vote({ session: people.milin, post: first }));
    app.clock.advance(HOUR); // season 0 ends
    await post(people.gigi, group, "next season");
    expect(ok(await archive(0)).archive.posts.map((p) => [p.post, p.votes])).toEqual([
      [first, 1],
      [third, 0],
      [second, 0],
    ]);
  });

  test("refuses NO_SUCH_SEASON for the season still running", async () => {
    await post(people.gigi, group, "now");
    expect(await archive(0)).toEqual({ error: "NO_SUCH_SEASON" });
  });

  test("refuses NO_SUCH_SEASON for a season the cycle doesn't have, and for a group with no cycle", async () => {
    app.clock.advance(5 * HOUR); // every season over
    expect(await archive(3)).toEqual({ error: "NO_SUCH_SEASON" });
    expect(await archive(-1)).toEqual({ error: "NO_SUCH_SEASON" });
    const { group: uncycled } = ok(await app.api.admin.groups.create({ session: people.milin, name: "Wings" }));
    expect(await archive(0, uncycled)).toEqual({ error: "NO_SUCH_SEASON" });
  });

  test("the last season is archived once the whole cycle has ended", async () => {
    app.clock.advance(2 * HOUR);
    const last = await post(people.gigi, group, "last");
    app.clock.advance(HOUR);
    expect(ok(await archive(2)).archive.posts.map((p) => p.post)).toEqual([last]);
  });
});

describe("images/link", () => {
  test("gives a working, short-lived link to an uploaded image", async () => {
    const image = await uploadImage(app.api, people.gigi, { bytes: 4321 });
    const { url } = ok(await app.api.images.link({ upload: image }));
    const fetched = await fetch(url);
    expect(fetched.status).toBe(200);
    expect((await fetched.arrayBuffer()).byteLength).toBe(4321);
    expect(new URL(url).searchParams.get("X-Amz-Expires")).toBe("300");
  });

  test("refuses NO_SUCH_UPLOAD", async () => {
    expect(await app.api.images.link({ upload: "unknown" })).toEqual({ error: "NO_SUCH_UPLOAD" });
  });

  test("GET /api/images/<upload> redirects the browser to the image", async () => {
    const image = await uploadImage(app.api, people.gigi, { bytes: 777 });
    const response = await app.http(new Request(`http://127.0.0.1:8080/api/images/${image}`));
    expect(response.status).toBe(302);
    const location = response.headers.get("location")!;
    const fetched = await fetch(location);
    expect((await fetched.arrayBuffer()).byteLength).toBe(777);
  });

  test("GET /api/images/<upload> answers 404 for an unknown upload", async () => {
    const response = await app.http(new Request("http://127.0.0.1:8080/api/images/unknown"));
    expect(response.status).toBe(404);
  });
});

describe("nominations/categories", () => {
  test("each category with its current round, blank when closed", async () => {
    const open = await openCategory(app.api, people.milin, "Future galleries", cycle);
    const closed = await createCategory("Future wings");
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
