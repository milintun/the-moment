import { beforeEach, describe, expect, test } from "bun:test";
import { SessioningConcept, UnknownSession } from "../../src/concepts/Sessioning.ts";
import { FakeClock, HOUR, MINUTE, T0, at, useTestDb } from "../helpers.ts";

const LIFETIME = 2 * HOUR;

const db = useTestDb("sessioning");
let clock: FakeClock;
let sessions: SessioningConcept;
beforeEach(() => {
  clock = new FakeClock();
  sessions = new SessioningConcept(db(), clock.read);
});

describe("principle", () => {
  test("a session resolves to its subject until it ends", async () => {
    const { session } = await sessions.start({ subject: "gigi" });
    expect(await sessions.current({ session })).toEqual({ subject: "gigi" });
    expect(await sessions._active({ session })).toEqual([{ subject: "gigi", expiresAt: at(LIFETIME) }]);
    expect(await sessions.end({ session })).toEqual({ ended: true });
    await expect(sessions.current({ session })).rejects.toBeInstanceOf(UnknownSession);
    expect(await sessions._active({ session })).toEqual([]);
  });
});

describe("start", () => {
  test("expires exactly 2 hours after the clock", async () => {
    const { expiresAt } = await sessions.start({ subject: "gigi" });
    expect(expiresAt).toEqual(new Date(T0.getTime() + LIFETIME));
  });

  test("two sessions for the same subject are independent", async () => {
    const first = await sessions.start({ subject: "gigi" });
    const second = await sessions.start({ subject: "gigi" });
    expect(first.session).not.toBe(second.session);
    await sessions.end({ session: first.session });
    expect(await sessions.current({ session: second.session })).toEqual({ subject: "gigi" });
  });
});

describe("current", () => {
  test("refuses UNKNOWN_SESSION for an invented session", async () => {
    await expect(sessions.current({ session: "invented" })).rejects.toBeInstanceOf(UnknownSession);
  });

  test("refuses UNKNOWN_SESSION at exactly expiresAt", async () => {
    const { session } = await sessions.start({ subject: "gigi" });
    clock.advance(LIFETIME);
    await expect(sessions.current({ session })).rejects.toBeInstanceOf(UnknownSession);
  });

  test("refuses an expired session and deletes it", async () => {
    const { session } = await sessions.start({ subject: "gigi" });
    clock.advance(LIFETIME + MINUTE);
    await expect(sessions.current({ session })).rejects.toBeInstanceOf(UnknownSession);
    clock.set(T0); // even back in time, the deleted session stays gone
    await expect(sessions.current({ session })).rejects.toBeInstanceOf(UnknownSession);
  });
});

describe("end", () => {
  test("refuses UNKNOWN_SESSION when ending twice", async () => {
    const { session } = await sessions.start({ subject: "gigi" });
    await sessions.end({ session });
    await expect(sessions.end({ session })).rejects.toBeInstanceOf(UnknownSession);
  });

  test("refuses UNKNOWN_SESSION for an expired session", async () => {
    const { session } = await sessions.start({ subject: "gigi" });
    clock.advance(LIFETIME + MINUTE);
    await expect(sessions.end({ session })).rejects.toBeInstanceOf(UnknownSession);
  });
});

describe("scenarios", () => {
  test("starting a session deletes other expired sessions", async () => {
    const { session: old } = await sessions.start({ subject: "gigi" });
    clock.advance(LIFETIME + MINUTE);
    await sessions.start({ subject: "sid" });
    clock.set(T0); // back inside the old session's lifetime, it no longer exists
    await expect(sessions.current({ session: old })).rejects.toBeInstanceOf(UnknownSession);
  });
});

describe("queries", () => {
  test("_active answers no row for an expired session but does not delete it", async () => {
    const { session } = await sessions.start({ subject: "gigi" });
    clock.advance(LIFETIME + MINUTE);
    expect(await sessions._active({ session })).toEqual([]);
    clock.set(T0); // still stored, so it resolves again inside its lifetime
    expect(await sessions.current({ session })).toEqual({ subject: "gigi" });
  });
});
