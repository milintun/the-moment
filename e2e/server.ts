// The app as end-to-end tests see it: a fresh e2e database with an owner account, then the
// real server (src/main.ts) serving the built frontend. Started by playwright.config.ts.
import { AuthenticatingConcept } from "../src/concepts/Authenticating.ts";
import { db } from "../src/db.ts";
import { makeOwner } from "../src/owner.ts";
import { OWNER } from "./helpers.ts";

if (db.databaseName !== "themoment_e2e") throw new Error(`Refusing to wipe "${db.databaseName}".`);
await db.dropDatabase();
await new AuthenticatingConcept(db).register(OWNER);
await makeOwner(db, OWNER.username);
await import("../src/main.ts");
