import { afterAll, beforeEach } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createLocalClient } from "@mit-sdg/sync-engine/client";
import type { TheMomentWire } from "../generated/wire.ts";
import { assembleApplication } from "../src/assembly.ts";
import { AdministratingConcept } from "../src/concepts/Administrating.ts";
import { db } from "../src/db.ts";
import { FakeClock, T0 } from "./helpers.ts";

type Api = ReturnType<typeof createLocalClient<TheMomentWire>>;

/**
 * The whole application with a fake clock and an in-process client, rebuilt on an
 * empty database before every test. Endpoints answer exact error codes, not HTTP ones.
 */
export function useApp() {
  // Composition tests share the app's database (src/db.ts), so refuse to run against real data.
  if (!db.databaseName.startsWith("themoment_test")) {
    throw new Error(`Refusing to wipe "${db.databaseName}". Run tests with \`bun run test\`.`);
  }
  const clock = new FakeClock();
  const app = { clock } as { clock: FakeClock; api: Api };

  beforeEach(async () => {
    await db.dropDatabase();
    clock.set(T0);
    // A fresh assembly also means fresh concept instances, so their indexes are recreated.
    app.api = createLocalClient<TheMomentWire>({
      invoker: createGateway({ application: assembleApplication({ clock: clock.read }) }),
    });
  });

  afterAll(async () => {
    await db.dropDatabase();
  });

  return app;
}

/** Registers a user and returns their session token. */
export async function signUp(api: Api, username: string): Promise<string> {
  const result = await api.auth.register({ username, password: "password123" });
  if ("error" in result) throw new Error(`register ${username} failed: ${result.error}`);
  return result.session;
}

/** Makes a user the owner the way scripts/set-owner.ts does, outside the endpoints. */
export async function makeOwner(username: string) {
  await new AdministratingConcept(db).setOwner({ user: username });
}

/** Unwraps a successful result, failing the test with the error code otherwise. */
export function ok<T extends object>(result: T): Exclude<T, { error: unknown }> {
  if ("error" in result) throw new Error(`expected success, got ${String(result.error)}`);
  return result as Exclude<T, { error: unknown }>;
}

export type Sessions = Record<"milin" | "gigi" | "sid" | "sasha", string>;

/** Registers Milin (made owner), Gigi, Sid, and Sasha, returning their sessions. */
export async function setUpPeople(api: Api): Promise<Sessions> {
  const people = {} as Sessions;
  for (const name of ["milin", "gigi", "sid", "sasha"] as const) people[name] = await signUp(api, name);
  await makeOwner("milin");
  return people;
}

/** Creates a cycle starting now with the given period and runs. */
export async function createCycle(api: Api, admin: string, period: number, runs: number): Promise<string> {
  return ok(await api.admin.cycles.create({ session: admin, period, runs })).cycle;
}

/** Creates a group and puts it in the cycle, so it is open now. */
export async function openGroup(api: Api, admin: string, name: string, cycle: string): Promise<string> {
  const { group } = ok(await api.admin.groups.create({ session: admin, name }));
  ok(await api.admin.cycles["add-item"]({ session: admin, cycle, item: group }));
  return group;
}

/** Creates a nomination category and puts it in the cycle, so it is open now. */
export async function openCategory(api: Api, admin: string, name: string, cycle: string): Promise<string> {
  const { category } = ok(await api.admin.categories.create({ session: admin, name }));
  ok(await api.admin.cycles["add-item"]({ session: admin, cycle, item: category }));
  return category;
}
