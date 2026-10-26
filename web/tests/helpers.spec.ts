import { beforeEach, describe, expect, test } from "vitest";
import { WING_MIN_PERIOD, finishedSeasons, isAdmin, isOwner, me, noticeWindow, normalizeName, refreshMe, seasonPhase, span } from "../api.ts";
import { SESSION_ENDED, explain } from "../errors.ts";
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

  test("tags galleries whose season just started or ends soon", async () => {
    const now = Date.now();
    const at = (ms: number) => new Date(now + ms).toISOString();
    fakeApi({
      "/groups/list": () => ({
        list: {
          groups: [
            groupRow("fresh", "Fresh", { runStart: at(-5 * 60_000), runEnd: at(HOUR) }),
            groupRow("mid", "Mid", { runStart: at(-HOUR / 2), runEnd: at(HOUR / 2) }),
            groupRow("late", "Late", { runStart: at(-HOUR), runEnd: at(5 * 60_000) }),
          ],
        },
      }),
    });
    const notices = (await rooms(now)).filter((r) => r.kind === "gallery").map((r) => [r.id, r.notice]);
    expect(notices).toEqual([["fresh", "new"], ["mid", undefined], ["late", "ending soon"]]);
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

describe("season notices", () => {
  const start = new Date("2026-01-01T00:00:00.000Z").getTime();
  const season = (period: number) => ({ runStart: new Date(start).toISOString(), runEnd: new Date(start + period).toISOString() });

  test("the window is 20% of the season, at most a day", () => {
    expect(noticeWindow(HOUR)).toBe(12 * 60_000);
    expect(noticeWindow(5 * DAY)).toBe(DAY);
    expect(noticeWindow(30 * DAY)).toBe(DAY);
  });

  test("new for the first 20%, ending for the last 20%, open between, ended after", () => {
    const window = 12 * 60_000; // of a 1-hour season
    const phase = (ms: number) => seasonPhase(season(HOUR), start + ms);
    expect(phase(0)).toBe("new");
    expect(phase(window - 1)).toBe("new");
    expect(phase(window)).toBe("open");
    expect(phase(HOUR - window - 1)).toBe("open");
    expect(phase(HOUR - window)).toBe("ending");
    expect(phase(HOUR - 1)).toBe("ending");
    expect(phase(HOUR)).toBe("ended");
  });

  test("long seasons warn only in their last and first day", () => {
    const phase = (ms: number) => seasonPhase(season(7 * DAY), start + ms);
    expect(phase(DAY - 1)).toBe("new");
    expect(phase(DAY)).toBe("open");
    expect(phase(6 * DAY - 1)).toBe("open");
    expect(phase(6 * DAY)).toBe("ending");
  });

  test("no phase without a running season", () => {
    expect(seasonPhase({ runStart: null, runEnd: null })).toBe(null);
  });

  test("spans read naturally", () => {
    expect(span(30_000)).toBe("less than a minute");
    expect(span(12 * 60_000)).toBe("12 min");
    expect(span(5 * HOUR)).toBe("5h");
    expect(span(30 * HOUR)).toBe("30h");
    expect(span(3 * DAY)).toBe("3 days");
  });
});

describe("explain", () => {
  test("uses the endpoint's own message for a category", () => {
    expect(explain("/posts/vote", "FORBIDDEN")).toBe("you can't vote on your own post.");
    expect(explain("/auth/sign-in", "UNAUTHORIZED")).toBe("wrong username or password.");
  });

  test("a tie from the page wins over the table", () => {
    expect(explain("/posts/vote", "CONFLICT", { CONFLICT: "season over" })).toBe("season over");
    expect(explain("/posts/vote", "CONFLICT", { CONFLICT: undefined })).toBe("you already voted for this post.");
  });

  test("falls back to the category, then to a general message", () => {
    expect(explain("/posts/mine", "UNAUTHORIZED")).toBe(SESSION_ENDED);
    expect(explain("/admin/cycles/delete", "NOT_FOUND")).toBe("this changed since the page opened, so it's been refreshed.");
    expect(explain("/posts/mine", "BAD_STATUS")).toBe("something went wrong. try again.");
  });

  test("a network failure says so", () => {
    expect(explain("/groups/list", "NETWORK_ERROR")).toBe("couldn't reach the museum. check your connection and try again.");
  });
});
