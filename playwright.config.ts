import { defineConfig } from "@playwright/test";

// End-to-end tests (`bun run test:e2e`): a real browser against the real server and the local
// MongoDB and storage (`bun run db:up` first), on their own database and the test bucket.
const PORT = 4173;
const ORIGIN = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  workers: 1, // the tests share one database
  use: { baseURL: ORIGIN, extraHTTPHeaders: { Origin: ORIGIN }, trace: "retain-on-failure" },
  webServer: {
    command: "bun e2e/server.ts",
    url: `${ORIGIN}/health`,
    reuseExistingServer: false,
    env: {
      PORT: String(PORT),
      PUBLIC_ORIGIN: ORIGIN,
      MONGODB_URL: "mongodb://dev:dev@127.0.0.1:27017/themoment_e2e?authSource=admin",
      S3_BUCKET: "the-moment-test",
    },
  },
});
