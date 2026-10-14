// Serves the built Vue app (web/dist, from `bun run build`) and forwards API calls to the backend.
// During development `bun run dev` uses Vite instead, which does the same with live reload.
const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:3000";
const dist = new URL("./dist/", import.meta.url);

// Pass API requests on to the backend.
function proxy(request: Request) {
  const url = new URL(request.url);
  return fetch(new URL(url.pathname + url.search, backend), request).catch(
    () => Response.json({ error: "UNAVAILABLE" }, { status: 503 }),
  );
}

const server = Bun.serve({
  hostname: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 8080),
  routes: { "/api/*": proxy },
  // A built file if one matches, otherwise index.html so the router handles paths like /groups/abc.
  async fetch(request) {
    const path = new URL(request.url).pathname.slice(1);
    const file = Bun.file(new URL(path.includes("..") ? "index.html" : path, dist));
    return new Response((await file.exists()) && path !== "" ? file : Bun.file(new URL("index.html", dist)));
  },
});

console.log(`Frontend listening on ${server.url}`);
