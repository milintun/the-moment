import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../../src/db.ts";
import { createCycle, ok, openCategory, setUpPeople, uploadImage, useApp, type Sessions } from "../app.ts";
import { HOUR, MINUTE, T0, at } from "../helpers.ts";

const app = useApp();
let people: Sessions;
beforeEach(async () => {
  people = await setUpPeople(app.api);
});

const DAY = 24 * HOUR;
const schedules = async () => ok(await app.api.admin.schedules.list({ session: people.milin })).list.schedules;
const galleries = async () => ok(await app.api.groups.list({})).list.groups;
/** Schedules galleries as milin: 1-hour seasons, 3 of them, starting now unless said otherwise. */
const schedule = (input: { names: string[]; period?: number; runs?: number; start?: Date; nominations?: string[] }) =>
  app.api.admin.schedules.create({
    session: people.milin,
    period: input.period ?? HOUR,
    runs: input.runs ?? 3,
    start: (input.start ?? app.clock.read()).toISOString(),
    names: input.names,
    ...(input.nominations ? { nominations: input.nominations } : {}),
  });
const post = async (group: string) =>
  app.api.posts.create({ session: people.gigi, group, content: await uploadImage(app.api, people.gigi) });

describe("access", () => {
  test("before anyone is the owner, admin endpoints refuse ADMIN_ONLY, even for milin", async () => {
    // Undo setUpPeople's owner, as on a fresh install before scripts/set-owner.ts runs.
    await db.collection("administrating.admins").deleteMany({});
    expect(await schedule({ names: ["Doodles"] })).toEqual({ error: "ADMIN_ONLY" });
    expect(await app.api.admin.admins.add({ session: people.milin, user: "gigi" })).toEqual({ error: "OWNER_ONLY" });
  });

  test("every admin-only endpoint refuses ADMIN_ONLY for a non-admin and changes nothing", async () => {
    const session = people.gigi;
    const calls = {
      "admins/list": () => app.api.admin.admins.list({ session }),
      "groups/remove-post": () => app.api.admin.groups["remove-post"]({ session, group: "x", post: "y" }),
      "schedules/list": () => app.api.admin.schedules.list({ session }),
      "schedules/create": () =>
        app.api.admin.schedules.create({ session, period: HOUR, runs: 1, start: T0.toISOString(), names: ["x"] }),
      "schedules/add-galleries": () => app.api.admin.schedules["add-galleries"]({ session, cycle: "x", names: ["y"] }),
      "schedules/set-runs": () => app.api.admin.schedules["set-runs"]({ session, cycle: "x", runs: 2 }),
      "schedules/remove-gallery": () => app.api.admin.schedules["remove-gallery"]({ session, cycle: "x", group: "y" }),
      "schedules/cancel": () => app.api.admin.schedules.cancel({ session, cycle: "x" }),
      "nominations/round": () => app.api.admin.nominations.round({ session, category: "x", round: 0 }),
    };
    for (const [name, call] of Object.entries(calls)) {
      expect({ name, result: await call() }).toEqual({ name, result: { error: "ADMIN_ONLY" } });
    }
    expect(await galleries()).toEqual([]);
    expect(await schedules()).toEqual([]);
  });

  test("owner-only endpoints refuse OWNER_ONLY for an admin who is not the owner", async () => {
    ok(await app.api.admin.admins.add({ session: people.milin, user: "gigi" }));
    expect(await app.api.admin.admins.add({ session: people.gigi, user: "sid" })).toEqual({ error: "OWNER_ONLY" });
    expect(await app.api.admin.admins.remove({ session: people.gigi, user: "gigi" })).toEqual({ error: "OWNER_ONLY" });
    const admins = ok(await app.api.admin.admins.list({ session: people.gigi })).list.admins;
    expect(admins.map((a) => a.user)).toEqual(["gigi", "milin"]);
  });

  test("a request without an active session refuses UNKNOWN_SESSION", async () => {
    expect(await app.api.admin.schedules.list({ session: "invented" })).toEqual({ error: "UNKNOWN_SESSION" });
  });
});

describe("admins", () => {
  test("the owner adds and removes admins, who then gain and lose access", async () => {
    expect(await app.api.admin.admins.add({ session: people.milin, user: "gigi" })).toEqual({ user: "gigi" });
    ok(await app.api.admin.schedules.list({ session: people.gigi }));
    expect(await app.api.admin.admins.remove({ session: people.milin, user: "gigi" })).toEqual({ user: "gigi" });
    expect(await app.api.admin.schedules.list({ session: people.gigi })).toEqual({ error: "ADMIN_ONLY" });
  });

  test("refuses NO_SUCH_USER for a name nobody registered, ALREADY_ADMIN, and OWNER_PROTECTED", async () => {
    expect(await app.api.admin.admins.add({ session: people.milin, user: "nobody" })).toEqual({ error: "NO_SUCH_USER" });
    ok(await app.api.admin.admins.add({ session: people.milin, user: "gigi" }));
    expect(await app.api.admin.admins.add({ session: people.milin, user: "gigi" })).toEqual({ error: "ALREADY_ADMIN" });
    expect(await app.api.admin.admins.remove({ session: people.milin, user: "milin" })).toEqual({ error: "OWNER_PROTECTED" });
    const admins = ok(await app.api.admin.admins.list({ session: people.milin })).list.admins;
    expect(admins.map((a) => a.user)).toEqual(["gigi", "milin"]);
  });

  test("an admin lists the admins with the owner flag", async () => {
    ok(await app.api.admin.admins.add({ session: people.milin, user: "sid" }));
    expect(await app.api.admin.admins.list({ session: people.sid })).toEqual({
      list: { admins: [{ user: "milin", owner: true }, { user: "sid", owner: false }] },
    });
  });
});

describe("groups/remove-post", () => {
  test("takes a post off a gallery's wall, keeping the post", async () => {
    const { groups: [doodles] } = ok(await schedule({ names: ["Doodles"] }));
    const { post: p } = ok(await post(doodles!));
    expect(await app.api.admin.groups["remove-post"]({ session: people.milin, group: doodles!, post: p })).toEqual({
      group: doodles,
      post: p,
    });
    expect(ok(await app.api.groups.feed({ group: doodles! })).feed.posts).toEqual([]);
    ok(await app.api.posts.get({ post: p }));
  });
});

describe("schedules/create", () => {
  test("makes the schedule and its galleries, open from the start, and lists them", async () => {
    const { cycle, groups } = ok(await schedule({ names: ["Doodles", "Night Walks"] }));
    expect(await schedules()).toEqual([
      {
        cycle,
        start: T0.toISOString(),
        period: HOUR,
        runs: 3,
        galleries: [
          { group: groups[0], name: "Doodles", runs: 3 },
          { group: groups[1], name: "Night Walks", runs: 3 },
        ].sort((a, b) => a.group!.localeCompare(b.group!)),
      },
    ]);
    expect((await galleries()).map((g) => [g.name, g.run])).toEqual([["Doodles", 0], ["Night Walks", 0]]);
    ok(await post(groups[0]!));
  });

  test("a schedule starting later keeps its galleries closed until then", async () => {
    const { groups } = ok(await schedule({ names: ["Doodles"], start: at(DAY) }));
    expect(await post(groups[0]!)).toEqual({ error: "GROUP_CLOSED" });
    app.clock.advance(DAY);
    ok(await post(groups[0]!));
  });

  test("refuses START_PASSED for a start in the past (beyond a minute's grace), and no schedule is made", async () => {
    expect(await schedule({ names: ["Doodles"], start: at(-2 * MINUTE) })).toEqual({ error: "START_PASSED" });
    expect(await schedules()).toEqual([]);
    expect((await galleries()).filter((g) => g.run != null)).toEqual([]); // nothing opened
  });

  test("refuses NO_NAMES, INVALID_NAME, DUPLICATE_NAME, and INVALID_CYCLE, making nothing", async () => {
    expect(await schedule({ names: [] })).toEqual({ error: "NO_NAMES" });
    expect(await schedule({ names: ["Doodles", " "] })).toEqual({ error: "INVALID_NAME" });
    expect(await schedule({ names: ["Night Walks", "night  walks"] })).toEqual({ error: "DUPLICATE_NAME" });
    expect(await schedule({ names: ["Doodles"], runs: 0 })).toEqual({ error: "INVALID_CYCLE" });
    expect(await schedules()).toEqual([]);
  });

  test("names only need to differ within a schedule", async () => {
    ok(await schedule({ names: ["Doodles"] }));
    ok(await schedule({ names: ["Doodles"], runs: 2 }));
    expect((await galleries()).map((g) => g.name)).toEqual(["Doodles", "Doodles"]);
  });

  test("refuses OVERLAPPING_SCHEDULE for the same season length and number while one runs; others may overlap", async () => {
    ok(await schedule({ names: ["Doodles"] })); // T0 .. 3 hours
    expect(await schedule({ names: ["Sketches"], start: at(2 * HOUR) })).toEqual({ error: "OVERLAPPING_SCHEDULE" });
    ok(await schedule({ names: ["Sketches"], start: at(3 * HOUR) })); // starts as the first ends
    ok(await schedule({ names: ["Zines"], runs: 2 })); // a different number of seasons
    ok(await schedule({ names: ["Wings"], period: DAY, runs: 3 })); // a different length
    expect(await schedules()).toHaveLength(4);
  });

  test("marks picked nominations chosen; refuses NOMINATION_UNAVAILABLE for a chosen one, making nothing", async () => {
    const category = await openCategory("Future galleries", await createCycle(app, DAY, 3));
    const { nomination } = ok(await app.api.nominations.create({ session: people.gigi, category, name: "Hands" }));
    ok(await schedule({ names: ["Hands"], nominations: [nomination] }));
    const ranking = ok(await app.api.nominations.list({ category })).ranking.nominations;
    expect(ranking.map((n) => [n.name, n.chosen])).toEqual([["Hands", true]]);
    expect(await app.api.nominations.withdraw({ session: people.gigi, nomination })).toEqual({ error: "CHOSEN" });
    expect(await schedule({ names: ["Hands again"], runs: 2, nominations: [nomination] })).toEqual({
      error: "NOMINATION_UNAVAILABLE",
    });
    expect(await schedules()).toHaveLength(1);
  });

  test("the cycle nomination rounds follow isn't a schedule: not listed, and never overlapping", async () => {
    await openCategory("Future galleries", await createCycle(app, HOUR, 3));
    expect(await schedules()).toEqual([]);
    ok(await schedule({ names: ["Doodles"] })); // same length and number of seasons, at the same time
  });
});

describe("schedules/set-runs", () => {
  test("extends a schedule and ends it early, but never before the season underway", async () => {
    const { cycle, groups } = ok(await schedule({ names: ["Doodles"], runs: 3 }));
    expect(await app.api.admin.schedules["set-runs"]({ session: people.milin, cycle, runs: 5 })).toEqual({ cycle, runs: 5 });
    app.clock.advance(HOUR + MINUTE); // season 1
    expect(await app.api.admin.schedules["set-runs"]({ session: people.milin, cycle, runs: 1 })).toEqual({
      error: "RUN_UNDERWAY",
    });
    ok(await app.api.admin.schedules["set-runs"]({ session: people.milin, cycle, runs: 2 }));
    ok(await post(groups[0]!)); // season 1 still runs
    app.clock.advance(HOUR);
    expect(await post(groups[0]!)).toEqual({ error: "GROUP_CLOSED" });
  });

  test("refuses OVERLAPPING_SCHEDULE when the new number would match an overlapping schedule", async () => {
    ok(await schedule({ names: ["Doodles"], runs: 3 }));
    const { cycle } = ok(await schedule({ names: ["Sketches"], runs: 2 }));
    expect(await app.api.admin.schedules["set-runs"]({ session: people.milin, cycle, runs: 3 })).toEqual({
      error: "OVERLAPPING_SCHEDULE",
    });
    expect((await schedules()).map((s) => s.runs).sort()).toEqual([2, 3]);
  });
});

describe("schedules/remove-gallery", () => {
  test("once started, the gallery finishes this season and leaves from the next; its season stays archived", async () => {
    const { cycle, groups } = ok(await schedule({ names: ["Doodles", "Sketches"] }));
    const [doodles] = groups;
    const { post: p } = ok(await post(doodles!));
    expect(await app.api.admin.schedules["remove-gallery"]({ session: people.milin, cycle, group: doodles! })).toEqual({
      cycle,
      group: doodles,
    });
    expect(ok(await app.api.groups.feed({ group: doodles! })).feed.posts.map((x) => x.post)).toEqual([p]);
    app.clock.advance(HOUR); // season 1
    expect(await post(doodles!)).toEqual({ error: "GROUP_CLOSED" });
    expect(ok(await app.api.groups.archive({ group: doodles!, season: 0 })).archive.posts.map((x) => x.post)).toEqual([p]);
    expect((await galleries()).find((g) => g.group === doodles)?.runs).toBe(1);
    expect((await schedules())[0]?.galleries.find((g) => g.group === doodles)?.runs).toBe(1);
  });

  test("before the start, the gallery is taken out and deleted", async () => {
    const { cycle, groups } = ok(await schedule({ names: ["Doodles", "Sketches"], start: at(DAY) }));
    ok(await app.api.admin.schedules["remove-gallery"]({ session: people.milin, cycle, group: groups[0]! }));
    expect((await galleries()).map((g) => g.name)).toEqual(["Sketches"]);
  });

  test("refuses LAST_ITEM for the last gallery and NO_LATER_RUN in the final season", async () => {
    const { cycle, groups } = ok(await schedule({ names: ["Doodles", "Sketches"], runs: 2 }));
    ok(await app.api.admin.schedules["remove-gallery"]({ session: people.milin, cycle, group: groups[0]! }));
    expect(await app.api.admin.schedules["remove-gallery"]({ session: people.milin, cycle, group: groups[1]! })).toEqual({
      error: "LAST_ITEM",
    });
    app.clock.advance(HOUR + MINUTE); // the final season
    expect(await app.api.admin.schedules["remove-gallery"]({ session: people.milin, cycle, group: groups[1]! })).toEqual({
      error: "NO_LATER_RUN",
    });
  });
});

describe("schedules/add-galleries", () => {
  const add = (cycle: string, names: string[], nominations?: string[]) =>
    app.api.admin.schedules["add-galleries"]({ session: people.milin, cycle, names, ...(nominations ? { nominations } : {}) });
  const names = async () => (await schedules())[0]!.galleries.map((g) => g.name).sort();

  test("adds galleries to a schedule that hasn't started, marking picked nominations chosen", async () => {
    const { cycle } = ok(await schedule({ names: ["Doodles"], start: at(DAY) }));
    const category = await openCategory("Future galleries", await createCycle(app, 7 * DAY, 10));
    const { nomination } = ok(await app.api.nominations.create({ session: people.gigi, category, name: "Hands" }));
    const { groups } = ok(await add(cycle, ["Sketches", "Hands"], [nomination]));
    expect(groups).toHaveLength(2);
    expect(await names()).toEqual(["Doodles", "Hands", "Sketches"]);
    expect(ok(await app.api.nominations.list({ category })).ranking.nominations[0]!.chosen).toBe(true);
    // They open with the schedule, like the galleries made with it.
    app.clock.advance(DAY);
    ok(await post(groups[0]!));
  });

  test("refuses DUPLICATE_NAME for a name already in the schedule, ignoring case and spacing, making nothing", async () => {
    const { cycle } = ok(await schedule({ names: ["Night Walks"], start: at(DAY) }));
    expect(await add(cycle, ["Sketches", "night  walks"])).toEqual({ error: "DUPLICATE_NAME" });
    expect(await names()).toEqual(["Night Walks"]);
    // Another schedule's names don't count.
    ok(await schedule({ names: ["Sketches"], runs: 2 }));
    ok(await add(cycle, ["Sketches"]));
  });

  test("refuses ALREADY_STARTED once the schedule has started, and NOMINATION_UNAVAILABLE for a gone nomination", async () => {
    const { cycle } = ok(await schedule({ names: ["Doodles"] }));
    expect(await add(cycle, ["Sketches"])).toEqual({ error: "ALREADY_STARTED" });
    const { cycle: later } = ok(await schedule({ names: ["Doodles"], runs: 2, start: at(DAY) }));
    expect(await add(later, ["Sketches"], ["gone"])).toEqual({ error: "NOMINATION_UNAVAILABLE" });
    expect((await galleries()).map((g) => g.name)).toEqual(["Doodles", "Doodles"]);
  });
});

describe("schedules/cancel", () => {
  test("cancels a schedule that hasn't started, deleting its galleries", async () => {
    const { cycle } = ok(await schedule({ names: ["Doodles", "Sketches"], start: at(DAY) }));
    expect(await app.api.admin.schedules.cancel({ session: people.milin, cycle })).toEqual({ cycle });
    expect(await schedules()).toEqual([]);
    expect(await galleries()).toEqual([]);
  });

  test("refuses ALREADY_STARTED once it has started, changing nothing", async () => {
    const { cycle } = ok(await schedule({ names: ["Doodles"] }));
    expect(await app.api.admin.schedules.cancel({ session: people.milin, cycle })).toEqual({ error: "ALREADY_STARTED" });
    expect(await schedules()).toHaveLength(1);
  });
});

describe("nominations/round", () => {
  test("a finished round's nominations ranked by votes, newest first on ties, saying which were chosen", async () => {
    const category = await openCategory("Future galleries", await createCycle(app, HOUR, 3));
    const round = (r: number) => app.api.admin.nominations.round({ session: people.milin, category, round: r });
    const nominate = async (session: string, name: string) =>
      ok(await app.api.nominations.create({ session, category, name })).nomination;

    const hands = await nominate(people.gigi, "Hands");
    app.clock.advance(MINUTE);
    const feet = await nominate(people.sid, "Feet");
    app.clock.advance(MINUTE);
    const rain = await nominate(people.sasha, "Rain");
    ok(await app.api.nominations.vote({ session: people.milin, nomination: hands }));
    ok(await app.api.nominations.vote({ session: people.milin, nomination: rain }));
    expect(await round(0)).toEqual({ error: "NO_SUCH_ROUND" }); // still running

    app.clock.advance(HOUR); // round 0 has finished
    ok(await schedule({ names: ["Hands"], nominations: [hands] }));
    const ranking = ok(await round(0)).ranking.nominations;
    expect(ranking.map((n) => [n.nomination, n.votes, n.chosen])).toEqual([
      [rain, 1, false],
      [hands, 1, true],
      [feet, 0, false],
    ]);
    expect(await round(5)).toEqual({ error: "NO_SUCH_ROUND" });
  });
});
