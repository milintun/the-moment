// Makes a registered account the application's owner (and so an admin). Run once:
//
//   bun scripts/set-owner.ts milin
//
// It uses MONGODB_URL from .env, which is the `bun run dev` database. For the containers
// (`bun run up`), point it at theirs:
//   MONGODB_URL='mongodb://dev:dev@127.0.0.1:27017/myapp?authSource=admin' bun scripts/set-owner.ts milin
import { client, db } from "../src/db.ts";
import { AdministratingConcept, OwnerExists } from "../src/concepts/Administrating.ts";
import { AuthenticatingConcept } from "../src/concepts/Authenticating.ts";

const username = process.argv[2];
if (!username) throw new Error("Usage: bun scripts/set-owner.ts <username>");

try {
  const { registered } = await new AuthenticatingConcept(db)._registered({ username });
  if (!registered) {
    console.error(`No account named ${username}. Register it first.`);
    process.exitCode = 1;
  } else {
    await new AdministratingConcept(db).setOwner({ user: username });
    console.log(`${username} is now the owner.`);
  }
} catch (error) {
  if (!(error instanceof OwnerExists)) throw error;
  console.error("There is already an owner; nothing changed.");
  process.exitCode = 1;
} finally {
  await client.close();
}
