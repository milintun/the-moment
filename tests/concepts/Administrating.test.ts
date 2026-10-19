import { beforeEach, describe, expect, test } from "bun:test";
import {
  AdministratingConcept,
  AlreadyAdmin,
  NotAdmin,
  OwnerExists,
  OwnerProtected,
} from "../../src/concepts/Administrating.ts";
import { useTestDb } from "../helpers.ts";

const db = useTestDb("administrating");
let admins: AdministratingConcept;
beforeEach(() => {
  admins = new AdministratingConcept(db());
});

const isAdmin = async (user: string) => (await admins._isAdmin({ user })).admin;
const isOwner = async (user: string) => (await admins._isOwner({ user })).owner;

describe("principle", () => {
  test("the owner manages admins and cannot be removed or replaced", async () => {
    await admins.setOwner({ user: "milin" });
    expect(await isOwner("milin")).toBe(true);
    expect(await isAdmin("milin")).toBe(true);

    await admins.addAdmin({ user: "gigi" });
    await admins.addAdmin({ user: "sid" });
    expect(await isAdmin("gigi")).toBe(true);
    expect(await isOwner("gigi")).toBe(false);
    expect(await isAdmin("sasha")).toBe(false);
    await expect(admins.addAdmin({ user: "gigi" })).rejects.toBeInstanceOf(AlreadyAdmin);

    await admins.removeAdmin({ user: "sid" });
    expect(await isAdmin("sid")).toBe(false);
    await expect(admins.removeAdmin({ user: "sid" })).rejects.toBeInstanceOf(NotAdmin);
    await expect(admins.removeAdmin({ user: "milin" })).rejects.toBeInstanceOf(OwnerProtected);
    await expect(admins.setOwner({ user: "sasha" })).rejects.toBeInstanceOf(OwnerExists);
  });
});

describe("setOwner", () => {
  test("makes a non-admin both admin and owner", async () => {
    expect(await admins.setOwner({ user: "milin" })).toEqual({});
    expect(await admins._admins({})).toEqual([{ user: "milin", owner: true }]);
  });

  test("promotes an existing admin to owner", async () => {
    await admins.addAdmin({ user: "gigi" });
    await admins.setOwner({ user: "gigi" });
    expect(await admins._admins({})).toEqual([{ user: "gigi", owner: true }]);
  });

  test("refuses OWNER_EXISTS and leaves the other user unchanged", async () => {
    await admins.setOwner({ user: "milin" });
    await expect(admins.setOwner({ user: "sasha" })).rejects.toBeInstanceOf(OwnerExists);
    expect(await isAdmin("sasha")).toBe(false);
    expect(await isOwner("sasha")).toBe(false);
    expect(await isOwner("milin")).toBe(true);
  });
});

describe("addAdmin", () => {
  test("adds an admin who is not the owner", async () => {
    expect(await admins.addAdmin({ user: "gigi" })).toEqual({});
    expect(await admins._admins({})).toEqual([{ user: "gigi", owner: false }]);
  });

  test("refuses ALREADY_ADMIN, including for the owner, who stays owner", async () => {
    await admins.setOwner({ user: "milin" });
    await expect(admins.addAdmin({ user: "milin" })).rejects.toBeInstanceOf(AlreadyAdmin);
    expect(await isOwner("milin")).toBe(true);
  });
});

describe("removeAdmin", () => {
  test("removes an admin, who can then be added again", async () => {
    await admins.addAdmin({ user: "gigi" });
    expect(await admins.removeAdmin({ user: "gigi" })).toEqual({});
    expect(await isAdmin("gigi")).toBe(false);
    await admins.addAdmin({ user: "gigi" });
    expect(await isAdmin("gigi")).toBe(true);
  });

  test("refuses NOT_ADMIN for a non-admin", async () => {
    await expect(admins.removeAdmin({ user: "sasha" })).rejects.toBeInstanceOf(NotAdmin);
  });

  test("refuses OWNER_PROTECTED and the owner stays admin and owner", async () => {
    await admins.setOwner({ user: "milin" });
    await expect(admins.removeAdmin({ user: "milin" })).rejects.toBeInstanceOf(OwnerProtected);
    expect(await isAdmin("milin")).toBe(true);
    expect(await isOwner("milin")).toBe(true);
  });
});

describe("queries", () => {
  test("_isAdmin and _isOwner are false for unknown users", async () => {
    expect(await admins._isAdmin({ user: "nobody" })).toEqual({ admin: false });
    expect(await admins._isOwner({ user: "nobody" })).toEqual({ owner: false });
  });

  test("_admins is empty, then ordered by user with owner flags", async () => {
    expect(await admins._admins({})).toEqual([]);
    await admins.addAdmin({ user: "sid" });
    await admins.setOwner({ user: "milin" });
    await admins.addAdmin({ user: "gigi" });
    expect(await admins._admins({})).toEqual([
      { user: "gigi", owner: false },
      { user: "milin", owner: true },
      { user: "sid", owner: false },
    ]);
  });
});
