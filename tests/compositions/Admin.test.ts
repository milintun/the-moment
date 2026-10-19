import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../../src/db.ts";
import { createCycle, ok, openCategory, openGroup, setUpPeople, useApp, type Sessions } from "../app.ts";
import { HOUR, MINUTE } from "../helpers.ts";

const app = useApp();
let people: Sessions;
beforeEach(async () => {
  people = await setUpPeople(app.api);
});

const cycles = async () => ok(await app.api.admin.cycles.list({ session: people.milin })).list.cycles;

describe("access", () => {
  test("before anyone is the owner, admin endpoints refuse ADMIN_ONLY, even for milin", async () => {
    // Undo setUpPeople's owner, as on a fresh install before scripts/set-owner.ts runs.
    await db.collection("administrating.admins").deleteMany({});
    expect(await app.api.admin.groups.create({ session: people.milin, name: "Doodles" })).toEqual({
      error: "ADMIN_ONLY",
    });
    expect(await app.api.admin.admins.add({ session: people.milin, user: "gigi" })).toEqual({ error: "OWNER_ONLY" });
  });

  test("every admin-only endpoint refuses ADMIN_ONLY for a non-admin and changes nothing", async () => {
    const session = people.gigi;
    const calls = {
      "admins/list": () => app.api.admin.admins.list({ session }),
      "groups/create": () => app.api.admin.groups.create({ session, name: "x" }),
      "groups/delete": () => app.api.admin.groups.delete({ session, group: "x" }),
      "groups/add-post": () => app.api.admin.groups["add-post"]({ session, group: "x", post: "y" }),
      "groups/remove-post": () => app.api.admin.groups["remove-post"]({ session, group: "x", post: "y" }),
      "categories/create": () => app.api.admin.categories.create({ session, name: "x" }),
      "nominations/previous": () => app.api.admin.nominations.previous({ session, category: "x" }),
      "cycles/list": () => app.api.admin.cycles.list({ session }),
      "cycles/create": () => app.api.admin.cycles.create({ session, period: HOUR, runs: 1 }),
      "cycles/delete": () => app.api.admin.cycles.delete({ session, cycle: "x" }),
      "cycles/add-item": () => app.api.admin.cycles["add-item"]({ session, cycle: "x", item: "y" }),
      "cycles/remove-item": () => app.api.admin.cycles["remove-item"]({ session, cycle: "x", item: "y" }),
      "cycles/set-runs": () => app.api.admin.cycles["set-runs"]({ session, cycle: "x", runs: 2 }),
    };
    for (const [name, call] of Object.entries(calls)) {
      expect({ name, result: await call() }).toEqual({ name, result: { error: "ADMIN_ONLY" } });
    }
    expect(ok(await app.api.groups.list({})).list.groups).toEqual([]);
    expect(await cycles()).toEqual([]);
  });

  test("owner-only endpoints refuse OWNER_ONLY for an admin who is not the owner", async () => {
    ok(await app.api.admin.admins.add({ session: people.milin, user: "gigi" }));
    expect(await app.api.admin.admins.add({ session: people.gigi, user: "sid" })).toEqual({ error: "OWNER_ONLY" });
    expect(await app.api.admin.admins.remove({ session: people.gigi, user: "gigi" })).toEqual({
      error: "OWNER_ONLY",
    });
    const admins = ok(await app.api.admin.admins.list({ session: people.gigi })).list.admins;
    expect(admins.map((a) => a.user)).toEqual(["gigi", "milin"]);
  });

  test("a request without an active session refuses UNKNOWN_SESSION", async () => {
    expect(await app.api.admin.groups.create({ session: "invented", name: "x" })).toEqual({
      error: "UNKNOWN_SESSION",
    });
  });
});

describe("admins", () => {
  test("the owner adds and removes admins, who then gain and lose access", async () => {
    expect(await app.api.admin.admins.add({ session: people.milin, user: "gigi" })).toEqual({ user: "gigi" });
    ok(await app.api.admin.groups.create({ session: people.gigi, name: "Doodles" }));
    expect(await app.api.admin.admins.remove({ session: people.milin, user: "gigi" })).toEqual({ user: "gigi" });
    expect(await app.api.admin.groups.create({ session: people.gigi, name: "Wings" })).toEqual({
      error: "ADMIN_ONLY",
    });
  });

  test("refuses ALREADY_ADMIN and OWNER_PROTECTED", async () => {
    ok(await app.api.admin.admins.add({ session: people.milin, user: "gigi" }));
    expect(await app.api.admin.admins.add({ session: people.milin, user: "gigi" })).toEqual({
      error: "ALREADY_ADMIN",
    });
    expect(await app.api.admin.admins.remove({ session: people.milin, user: "milin" })).toEqual({
      error: "OWNER_PROTECTED",
    });
  });

  test("an admin lists the admins with the owner flag", async () => {
    ok(await app.api.admin.admins.add({ session: people.milin, user: "sid" }));
    expect(await app.api.admin.admins.list({ session: people.sid })).toEqual({
      list: {
        admins: [
          { user: "milin", owner: true },
          { user: "sid", owner: false },
        ],
      },
    });
  });
});

describe("groups", () => {
  test("create, and refuse NAME_TAKEN", async () => {
    ok(await app.api.admin.groups.create({ session: people.milin, name: "Doodles" }));
    expect(await app.api.admin.groups.create({ session: people.milin, name: "Doodles" })).toEqual({
      error: "NAME_TAKEN",
    });
    expect(ok(await app.api.groups.list({})).list.groups).toHaveLength(1);
  });

  test("deleting a group removes it from its cycle", async () => {
    const cycle = await createCycle(app.api, people.milin, HOUR, 2);
    const group = await openGroup(app.api, people.milin, "Doodles", cycle);
    expect(await app.api.admin.groups.delete({ session: people.milin, group })).toEqual({ group });
    expect(ok(await app.api.groups.list({})).list.groups).toEqual([]);
    expect((await cycles())[0]?.items).toEqual([]);
  });

  test("add-post and remove-post curate a group's posts", async () => {
    const cycle = await createCycle(app.api, people.milin, HOUR, 2);
    const doodles = await openGroup(app.api, people.milin, "Doodles", cycle);
    const sketches = await openGroup(app.api, people.milin, "Sketches", cycle);
    const { post } = ok(await app.api.posts.create({ session: people.gigi, group: doodles, content: "x" }));
    const feed = async (group: string) => ok(await app.api.groups.feed({ group })).feed.posts.map((p) => p.post);

    expect(await app.api.admin.groups["add-post"]({ session: people.milin, group: sketches, post })).toEqual({
      group: sketches,
      post,
    });
    expect(await feed(sketches)).toEqual([post]);
    expect(await app.api.admin.groups["remove-post"]({ session: people.milin, group: doodles, post })).toEqual({
      group: doodles,
      post,
    });
    expect(await feed(doodles)).toEqual([]);
  });
});

describe("categories", () => {
  test("create, and refuse NAME_TAKEN", async () => {
    ok(await app.api.admin.categories.create({ session: people.milin, name: "Future galleries" }));
    expect(await app.api.admin.categories.create({ session: people.milin, name: "Future galleries" })).toEqual({
      error: "NAME_TAKEN",
    });
    expect(ok(await app.api.nominations.categories({})).list.categories).toHaveLength(1);
  });
});

describe("previous ranking", () => {
  test("empty in the first round, then last round's nominations ranked by votes, newest first on ties", async () => {
    const cycle = await createCycle(app.api, people.milin, HOUR, 3);
    const category = await openCategory(app.api, people.milin, "Future galleries", cycle);
    const previous = async () =>
      ok(await app.api.admin.nominations.previous({ session: people.milin, category })).ranking.nominations;
    const nominate = async (session: string, name: string) =>
      ok(await app.api.nominations.create({ session, category, name })).nomination;

    expect(await previous()).toEqual([]);
    const hands = await nominate(people.gigi, "Hands");
    app.clock.advance(MINUTE);
    const feet = await nominate(people.sid, "Feet");
    app.clock.advance(MINUTE);
    const rain = await nominate(people.sasha, "Rain");
    ok(await app.api.nominations.vote({ session: people.milin, nomination: hands }));
    ok(await app.api.nominations.vote({ session: people.milin, nomination: rain }));

    app.clock.advance(HOUR); // round 1 begins; round 0 is now the previous round
    expect((await previous()).map((n) => [n.name, n.votes])).toEqual([
      ["Rain", 1],
      ["Hands", 1],
      ["Feet", 0],
    ]);
    expect((await previous()).map((n) => n.nomination)).toEqual([rain, hands, feet]);
  });
});

describe("cycles", () => {
  test("create and list with the items each cycle holds", async () => {
    const cycle = await createCycle(app.api, people.milin, HOUR, 3);
    const group = await openGroup(app.api, people.milin, "Doodles", cycle);
    const category = await openCategory(app.api, people.milin, "Future galleries", cycle);
    const listed = await cycles();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ cycle, period: HOUR, runs: 3 });
    expect(listed[0]?.items.map((i) => i.item).sort()).toEqual([group, category].sort());
  });

  test("add-item refuses NO_SUCH_ITEM for anything but a group or category", async () => {
    const cycle = await createCycle(app.api, people.milin, HOUR, 3);
    expect(await app.api.admin.cycles["add-item"]({ session: people.milin, cycle, item: "not-a-thing" })).toEqual({
      error: "NO_SUCH_ITEM",
    });
    expect((await cycles())[0]?.items).toEqual([]);
  });

  test("remove-item closes the item", async () => {
    const cycle = await createCycle(app.api, people.milin, HOUR, 3);
    const group = await openGroup(app.api, people.milin, "Doodles", cycle);
    expect(await app.api.admin.cycles["remove-item"]({ session: people.milin, cycle, item: group })).toEqual({
      cycle,
      item: group,
    });
    expect(await app.api.posts.create({ session: people.gigi, group, content: "x" })).toEqual({
      error: "GROUP_CLOSED",
    });
  });

  test("set-runs ending a cycle early closes its group to posting", async () => {
    const cycle = await createCycle(app.api, people.milin, HOUR, 3);
    const group = await openGroup(app.api, people.milin, "Doodles", cycle);
    app.clock.advance(HOUR + MINUTE); // run 1
    expect(await app.api.admin.cycles["set-runs"]({ session: people.milin, cycle, runs: 1 })).toEqual({
      cycle,
      runs: 1,
    });
    expect(await app.api.posts.create({ session: people.gigi, group, content: "x" })).toEqual({
      error: "GROUP_CLOSED",
    });
  });

  test("delete removes the cycle and closes what it held", async () => {
    const cycle = await createCycle(app.api, people.milin, HOUR, 3);
    const group = await openGroup(app.api, people.milin, "Doodles", cycle);
    expect(await app.api.admin.cycles.delete({ session: people.milin, cycle })).toEqual({ cycle });
    expect(await cycles()).toEqual([]);
    expect(await app.api.posts.create({ session: people.gigi, group, content: "x" })).toEqual({
      error: "GROUP_CLOSED",
    });
  });
});
