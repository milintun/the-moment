import { beforeEach, describe, expect, test } from "bun:test";
import { AdministratingConcept } from "../src/concepts/Administrating.ts";
import { AuthenticatingConcept } from "../src/concepts/Authenticating.ts";
import { makeOwner } from "../src/owner.ts";
import { useTestDb } from "./helpers.ts";

const db = useTestDb("owner");
let auth: AuthenticatingConcept;
let admins: AdministratingConcept;
beforeEach(() => {
  auth = new AuthenticatingConcept(db());
  admins = new AdministratingConcept(db());
});

describe("makeOwner (the OWNER setting and scripts/set-owner.ts)", () => {
  test("makes a registered account the owner", async () => {
    await auth.register({ username: "milin", password: "password123" });
    expect(await makeOwner(db(), "milin")).toBe("made-owner");
    expect(await admins._isOwner({ user: "milin" })).toEqual({ owner: true });
  });

  test("never makes an unregistered name the owner, even once it is registered by someone later", async () => {
    expect(await makeOwner(db(), "milin")).toBe("no-account");
    await auth.register({ username: "milin", password: "someone-else" });
    expect(await admins._isOwner({ user: "milin" })).toEqual({ owner: false });
    expect(await admins._admins({})).toEqual([]);
  });

  test("never replaces an existing owner, so restarting with OWNER set changes nothing", async () => {
    await auth.register({ username: "milin", password: "password123" });
    await auth.register({ username: "sasha", password: "password123" });
    expect(await makeOwner(db(), "milin")).toBe("made-owner");
    expect(await makeOwner(db(), "milin")).toBe("owner-exists");
    expect(await makeOwner(db(), "sasha")).toBe("owner-exists");
    expect(await admins._admins({})).toEqual([{ user: "milin", owner: true }]);
  });
});
