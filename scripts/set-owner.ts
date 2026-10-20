// Makes a registered account the application's owner (and so an admin). Run once:
//
//   bun scripts/set-owner.ts milin
//
// It uses MONGODB_URL from .env, which is the `bun run dev` database. For the containers
// (`bun run up`), point it at theirs:
//   MONGODB_URL='mongodb://dev:dev@127.0.0.1:27017/myapp?authSource=admin' bun scripts/set-owner.ts milin
// On the platform, set the OWNER variable instead; the app does the same thing at startup.
import { client, db } from "../src/db.ts";
import { makeOwner } from "../src/owner.ts";

const username = process.argv[2];
if (!username) throw new Error("Usage: bun scripts/set-owner.ts <username>");

try {
  const result = await makeOwner(db, username);
  if (result === "made-owner") console.log(`${username} is now the owner.`);
  else {
    console.error(result === "no-account" ? `No account named ${username}. Register it first.` : "There is already an owner; nothing changed.");
    process.exitCode = 1;
  }
} finally {
  await client.close();
}
