import { beforeEach, describe, expect, test } from "vitest";
import { WING_MIN_PERIOD, finishedSeasons, isAdmin, isOwner, me, normalizeName, refreshMe } from "../api.ts";
import { neighbours, rooms, type Room } from "../museum.ts";
import { fakeApi, groupRow, signedInAs } from "./fake.ts";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("normalizeName", () => {
  test("trims, collapses spaces, and lowercases", () => {
    expect(normalizeName("  Night   Walks ")).toBe("night walks");
  });
});

describe("finishedSeasons", () => {
  const start = "2026-01-01T00:00:00.000Z";
  const t = (ms: number) => new Date(start).getTime() + ms;

  test("only seasons whose end has passed, each with its dates", () => {
    expect(finishedSeasons({ start, period: DAY, runs: 3 }, t(2 * DAY + HOUR))).toEqual([
      { season: 0, start: new Date(t(0)), end: new Date(t(DAY)) },
      { season: 1, start: new Date(t(DAY)), end: new Date(t(2 * DAY)) },
    ]);
  });

  test("a season counts as finished exactly at its end, and never past the last run", () => {
    expect(finishedSeasons({ start, period: DAY, runs: 2 }, t(DAY)).map((s) => s.season)).toEqual([0]);
    expect(finishedSeasons({ start, period: DAY, runs: 2 }, t(10 * DAY)).map((s) => s.season)).toEqual([0, 1]);
  });

  test("nothing for a gallery without a cycle", () => {
    expect(finishedSeasons({ start: null, period: null, runs: null })).toEqual([]);
  });
});

describe("refreshMe", () => {
  beforeEach(() => signedInAs(null));

  test("a signed-in admin who is the owner", async () => {
    fakeApi({
      "/auth/current": () => ({ username: "milin" }),
      "/admin/admins/list": () => ({ list: { admins: [{ user: "milin", owner: true }] } }),
    });
    await refreshMe();
    expect([me.value, isAdmin.value, isOwner.value]).toEqual(["milin", true, true]);
  });

  test("a signed-in visitor who isn't an admin", async () => {
    fakeApi({ "/auth/current": () => ({ username: "gigi" }), "/admin/admins/list": () => ({ error: "FORBIDDEN" }) });
    await refreshMe();
    expect([me.value, isAdmin.value, isOwner.value]).toEqual(["gigi", false, false]);
  });

  test("signed out, without asking for the admins", async () => {
    const api = fakeApi({ "/auth/current": () => ({ error: "UNAUTHORIZED" }) });
    await refreshMe();
    expect([me.value, isAdmin.value]).toEqual([null, false]);
    expect(api.called("/admin/admins/list")).toEqual([]);
  });
});

describe("rooms", () => {
  test("entrance, home, open wings, open galleries, future galleries, archive; closed ones left out", async () => {
    fakeApi({
      "/groups/list": () => ({
        list: {
          groups: [
            groupRow("g1", "Doodles"),
            groupRow("w1", "Still Life", { period: WING_MIN_PERIOD }),
            groupRow("g2", "Closed", { run: null, runStart: null, runEnd: null }),
          ],
        },
      }),
    });
    expect((await rooms()).map((r) => [r.id, r.kind, r.to])).toEqual([
      ["entrance", "entrance", "/"],
      ["home", "home", "/home"],
      ["w1", "wing", "/galleries/w1"],
      ["g1", "gallery", "/galleries/g1"],
      ["nominations", "nominations", "/nominations"],
      ["archive", "archive", "/archive"],
    ]);
  });

  test("still gives the fixed rooms when the gallery list fails", async () => {
    fakeApi({});
    expect((await rooms()).map((r) => r.id)).toEqual(["entrance", "home", "nominations", "archive"]);
  });
});

describe("neighbours", () => {
  const all = ["a", "b", "c"].map((id) => ({ id, kind: "gallery", label: id, to: `/${id}` }) as Room);
  const ids = (n: { before: Room[]; after: Room[] }) => [n.before.map((r) => r.id), n.after.map((r) => r.id)];

  test("the room before and after, none past either end, nothing for an unknown room", () => {
    expect(ids(neighbours(all, "b"))).toEqual([["a"], ["c"]]);
    expect(ids(neighbours(all, "a"))).toEqual([[], ["b"]]);
    expect(ids(neighbours(all, "c"))).toEqual([["b"], []]);
    expect(ids(neighbours(all, "z"))).toEqual([[], []]);
  });
});
