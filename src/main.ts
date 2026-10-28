import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "./assembly.ts";
import { db } from "./db.ts";
import { policy } from "./http.ts";
import { ensureFutureGalleries } from "./nominations.ts";
import { makeOwner } from "./owner.ts";

const application = assembleApplication();
const gateway = createGateway({ application });
const api = createHttpHandler({ application, gateway, policy });

// The built Vue app (`bun run build`), served by this same server when deployed.
const dist = `${import.meta.dir}/../web/dist`;

const server = Bun.serve({
  hostname: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3000),
  routes: {
    "/api/*": api,
    // The platform's health check: ok only while MongoDB answers.
    "/health": async () => {
      try {
        await db.command({ ping: 1 }, { timeoutMS: 3000 });
        return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
      } catch {
        return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
    },
  },
  // Any other path: a built file if one exists, otherwise index.html so Vue Router shows the page.
  async fetch(request) {
    const file = Bun.file(dist + new URL(request.url).pathname);
    return new Response((await file.exists()) ? file : Bun.file(`${dist}/index.html`));
  },
});

// The one nomination category always exists. A database that can't be reached is logged
// here (the health check then fails) rather than stopping the server.
try {
  await ensureFutureGalleries(db);
} catch (error) {
  console.error("Startup couldn't reach MongoDB. Check MONGODB_URL and the database's network access.", error);
}

console.log(`Backend ready on ${server.url}`);

// Setting OWNER makes that registered account the owner when the app starts, if there is no
// owner yet. On the platform, register the account first, then set OWNER and restart.
if (process.env.OWNER) {
  const result = await makeOwner(db, process.env.OWNER);
  console.log(
    result === "made-owner"
      ? `${process.env.OWNER} is now the owner.`
      : result === "no-account"
        ? `OWNER is ${process.env.OWNER}, but there is no such account yet; register it, then restart.`
        : "OWNER is set, but the application already has an owner; nothing changed.",
  );
}
