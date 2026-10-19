import { beforeEach, describe, expect, test } from "bun:test";
import {
  AuthenticatingConcept,
  InvalidCredentials,
  InvalidPassword,
  InvalidUsername,
  UsernameTaken,
} from "../../src/concepts/Authenticating.ts";
import { useTestDb } from "../helpers.ts";

const db = useTestDb("authenticating");
let auth: AuthenticatingConcept;
beforeEach(() => {
  auth = new AuthenticatingConcept(db());
});

const registered = async (username: string) => (await auth._registered({ username })).registered;

describe("principle", () => {
  test("register, refuse a duplicate and a wrong password, accept the right one", async () => {
    expect(await auth.register({ username: "milin", password: "password123" })).toEqual({ account: "milin" });
    expect(await registered("milin")).toBe(true);
    await expect(auth.register({ username: "milin", password: "other-pass" })).rejects.toBeInstanceOf(UsernameTaken);
    await expect(auth.authenticate({ username: "milin", password: "wrong-pass" })).rejects.toBeInstanceOf(
      InvalidCredentials,
    );
    expect(await auth.authenticate({ username: "milin", password: "password123" })).toEqual({ account: "milin" });
  });
});

describe("register", () => {
  test("returns the username as the account", async () => {
    expect(await auth.register({ username: "gigi", password: "password123" })).toEqual({ account: "gigi" });
  });

  test("refuses INVALID_USERNAME below 3 and above 32 characters, registering nothing", async () => {
    for (const username of ["ab", "a".repeat(33)]) {
      await expect(auth.register({ username, password: "password123" })).rejects.toBeInstanceOf(InvalidUsername);
      expect(await registered(username)).toBe(false);
    }
  });

  test("accepts usernames of exactly 3 and 32 characters", async () => {
    for (const username of ["abc", "a".repeat(32)]) {
      expect(await auth.register({ username, password: "password123" })).toEqual({ account: username });
    }
  });

  test("refuses INVALID_PASSWORD below 8 and above 128 characters, registering nothing", async () => {
    for (const [username, password] of [["sid", "1234567"], ["sasha", "p".repeat(129)]] as const) {
      await expect(auth.register({ username, password })).rejects.toBeInstanceOf(InvalidPassword);
      expect(await registered(username)).toBe(false);
    }
  });

  test("accepts passwords of exactly 8 and 128 characters", async () => {
    expect(await auth.register({ username: "sid", password: "12345678" })).toEqual({ account: "sid" });
    expect(await auth.register({ username: "sasha", password: "p".repeat(128) })).toEqual({ account: "sasha" });
  });

  test("refuses USERNAME_TAKEN and keeps the original password", async () => {
    await auth.register({ username: "gigi", password: "original-pass" });
    await expect(auth.register({ username: "gigi", password: "replacement" })).rejects.toBeInstanceOf(UsernameTaken);
    expect(await auth.authenticate({ username: "gigi", password: "original-pass" })).toEqual({ account: "gigi" });
    await expect(auth.authenticate({ username: "gigi", password: "replacement" })).rejects.toBeInstanceOf(
      InvalidCredentials,
    );
  });
});

describe("authenticate", () => {
  test("refuses INVALID_CREDENTIALS for an unknown username", async () => {
    await expect(auth.authenticate({ username: "nobody", password: "password123" })).rejects.toBeInstanceOf(
      InvalidCredentials,
    );
  });

  test("refuses INVALID_CREDENTIALS for a wrong password, the same error as an unknown username", async () => {
    await auth.register({ username: "gigi", password: "password123" });
    await expect(auth.authenticate({ username: "gigi", password: "password124" })).rejects.toBeInstanceOf(
      InvalidCredentials,
    );
  });
});

describe("scenarios", () => {
  test("the stored account never contains the plain password", async () => {
    await auth.register({ username: "gigi", password: "very-secret-pass" });
    const stored = await db().collection("authenticating.accounts").findOne({ username: "gigi" });
    expect(stored).not.toBeNull();
    expect(JSON.stringify(stored)).not.toContain("very-secret-pass");
  });
});

describe("queries", () => {
  test("_registered is false for an unknown username", async () => {
    expect(await auth._registered({ username: "nobody" })).toEqual({ registered: false });
  });
});
