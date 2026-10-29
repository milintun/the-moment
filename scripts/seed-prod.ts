// Wipes the database and seeds demo history (see src/seed.ts). Uses MONGODB_URL and S3_* from
// .env. On the platform, set SEED_RESET=yes instead.
//
//   bun scripts/seed-prod.ts --reset
import { client, db } from "../src/db.ts";
import { seed } from "../src/seed.ts";

if (!process.argv.includes("--reset")) {
  console.log(`This drops the database "${db.databaseName}" and reseeds it. Run again with --reset.`);
  process.exit(1);
}
try {
  await seed(db);
} finally {
  await client.close();
}
