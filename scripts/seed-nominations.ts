// Fills the current Future galleries round with a dozen dummy nominations and some upvotes,
// going through the real API, so the nominations page has something to show.
//
//   bun scripts/seed-nominations.ts [http://127.0.0.1:8080]
//
// Each idea comes from its own dummy account (registered here, or signed into when it already
// exists; usernames need 3 or more characters), since an account nominates at most once a day.
// Running it again the same day skips what's already done.
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { TheMomentWireHttp } from "../generated/wire.ts";

const address = process.argv[2] ?? "http://127.0.0.1:8080";
const PASSWORD = "password123";

// [nominator, idea]
const IDEAS: Array<[string, string]> = [
  ["ada", "Rainy days"],
  ["bob", "Hands"],
  ["cyd", "Self portraits"],
  ["dee", "Kitchen still lifes"],
  ["eli", "Night walks"],
  ["fern", "Windows"],
  ["gus", "Strangers on trains"],
  ["hana", "Houseplants"],
  ["ivo", "Mirrors"],
  ["jun", "Shoes"],
  ["kit", "Maps from memory"],
  ["lou", "Things in pockets"],
];

// A client that keeps its own session cookie, like one browser would.
function clientFor() {
  let cookie = "";
  return createHttpClient<TheMomentWireHttp>({
    baseUrl: `${address}/api`,
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (cookie) headers.set("Cookie", cookie);
      const response = await fetch(input, { ...init, headers });
      const set = response.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0]!;
      return response;
    }) as typeof fetch,
  });
}

const anyone = clientFor();
const categories = await anyone.nominations.categories({});
if ("error" in categories) throw new Error(`listing categories failed: ${categories.error}`);
const category = categories.list.categories.find((c) => c.name === "Future galleries");
if (!category || category.run == null) throw new Error("Future galleries isn't open; is the server running?");

const people: Array<{ name: string; client: ReturnType<typeof clientFor>; nomination?: string }> = [];
for (const [name, idea] of IDEAS) {
  const client = clientFor();
  const registered = await client.auth.register({ username: name, password: PASSWORD });
  if ("error" in registered) {
    const signedIn = await client.auth["sign-in"]({ username: name, password: PASSWORD });
    if ("error" in signedIn) throw new Error(`${name} can't register or sign in: ${signedIn.error}`);
  }
  const made = await client.nominations.create({ category: category.category, name: idea });
  if ("error" in made) console.log(`skipped "${idea}" by ${name}: ${made.error}`);
  people.push({ name, client, nomination: "error" in made ? undefined : made.nomination });
}

// Upvotes that fall off down the list, so the ranking has a clear order: the first idea gets
// eleven votes, the next ten, and so on.
let votes = 0;
for (const [i, { nomination }] of people.entries()) {
  if (!nomination) continue;
  for (const voter of people.slice(i + 1)) {
    const voted = await voter.client.nominations.vote({ nomination });
    if (!("error" in voted)) votes++;
  }
}
console.log(`${people.filter((p) => p.nomination).length} nominations and ${votes} votes. Done.`);
