// Fills seed-images/<slug>/ with candidate images for each gallery in src/seed.data.ts,
// about half again as many as it posts, so there's room to delete the ones that don't fit.
// Then writes seed-images/index.html: every candidate on one page, to review before seeding.
//
//   bun scripts/fetch-seed-images.ts            (skips galleries that already have a folder)
//   bun scripts/fetch-seed-images.ts "Hands"    (fetches just these, replacing their folders)
//
// Only openly licensed images: public domain art from the Art Institute of Chicago, and
// CC0 / public domain photos from Openverse (slow: a search can take 30s or more).
// Each folder's sources.json records where every image came from, and src/seed.images.json
// (what the seed downloads from) lists the images still in the folders.
import { mkdir, readdir, rm } from "node:fs/promises";
import { EXCLUDE, GALLERIES, slug, type Gallery } from "../src/seed.data.ts";

const ROOT = `${import.meta.dir}/../seed-images`;
const AGENT = { "User-Agent": "the-moment-seed (milin.tuns@silverside.ai)" };

interface Found { url: string; title: string; by: string; license: string; page: string }

async function get(url: string, tries = 3): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: AGENT, signal: AbortSignal.timeout(120_000) });
      if (res.ok) return res;
      if (i >= tries) throw new Error(`${res.status} ${url}`);
    } catch (e) {
      if (i >= tries) throw e;
    }
    await Bun.sleep(2000 * i);
  }
}

async function search([source, q, type]: Gallery["search"][number], n: number): Promise<Found[]> {
  if (source === "art") {
    const params = new URLSearchParams({ q, limit: String(n * 3), fields: "id,title,artist_title,image_id" });
    params.append("query[bool][must][][term][is_public_domain]", "true");
    if (type) params.append("query[bool][must][][match][artwork_type_title]", type);
    const url = `https://api.artic.edu/api/v1/artworks/search?${params}`;
    const { data } = (await (await get(url)).json()) as { data: Array<{ id: number; title: string; artist_title: string | null; image_id: string | null }> };
    return data.filter((a) => a.image_id).map((a) => ({
      url: `https://www.artic.edu/iiif/2/${a.image_id}/full/843,/0/default.jpg`,
      title: a.title, by: a.artist_title ?? "unknown", license: "public domain (CC0)", page: `https://www.artic.edu/artworks/${a.id}`,
    }));
  }
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm&mature=false&page_size=${Math.min(20, n * 3)}`;
  const { results } = (await (await get(url)).json()) as { results: Array<{ url: string; title: string; creator: string | null; license: string; foreign_landing_url: string }> };
  return results.map((r) => ({ url: r.url, title: r.title, by: r.creator ?? "unknown", license: r.license, page: r.foreign_landing_url }));
}

const only = process.argv.slice(2);
const todo = only.length ? GALLERIES.filter((g) => only.includes(g.name)) : GALLERIES;
await mkdir(ROOT, { recursive: true });

// Images other galleries already have, so one picture never hangs in two places.
const seen = new Set<string>();
for (const g of GALLERIES) {
  if (todo.includes(g)) continue;
  const file = Bun.file(`${ROOT}/${slug(g.name)}/sources.json`);
  if (await file.exists()) for (const f of Object.values((await file.json()) as Record<string, Found>)) seen.add(f.url);
}

for (const g of todo) {
  const dir = `${ROOT}/${slug(g.name)}`;
  if (!only.length && (await Bun.file(`${dir}/sources.json`).exists())) { console.log(`${g.name}: already fetched`); continue; }
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const want = Math.ceil(g.posts * 1.5);
  const each = Math.ceil(want / g.search.length);
  const sources: Record<string, Found> = {};
  let n = 0;
  for (const terms of g.search) {
    let found: Found[] = [];
    try { found = await search(terms, each); } catch (e) { console.log(`  ${g.name} / ${terms[1]}: search failed (${e})`); }
    let got = 0;
    for (const f of found) {
      if (got >= each || seen.has(f.url) || EXCLUDE.test(f.title)) continue;
      seen.add(f.url);
      try {
        const res = await get(f.url, 2);
        const type = res.headers.get("content-type") ?? "";
        if (!type.startsWith("image/")) continue;
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.length < 10_000 || bytes.length > 10_000_000) continue; // too small to show, or over the app's limit
        const file = `${String(++n).padStart(2, "0")}.${type.includes("png") ? "png" : "jpg"}`;
        await Bun.write(`${dir}/${file}`, bytes);
        sources[file] = f;
        got++;
      } catch { /* a dead link: skip it */ }
    }
  }
  await Bun.write(`${dir}/sources.json`, JSON.stringify(sources, null, 2));
  console.log(`${g.name}: ${n} of ${want} wanted`);
}

// The review page: every gallery's candidates, with file names to delete by.
let html = `<!doctype html><meta charset="utf-8"><title>seed images</title><style>
body{font:13px system-ui;margin:24px}h2{margin:32px 0 4px}.grid{display:flex;flex-wrap:wrap;gap:10px}
figure{margin:0;width:180px}img{width:180px;height:180px;object-fit:cover;background:#eee}figcaption{font-size:11px;color:#555}</style>`;
for (const g of GALLERIES) {
  const dir = `${ROOT}/${slug(g.name)}`;
  if (!(await Bun.file(`${dir}/sources.json`).exists())) continue;
  const files = (await readdir(dir)).filter((f) => f !== "sources.json").sort();
  const sources = (await Bun.file(`${dir}/sources.json`).json()) as Record<string, Found>;
  html += `<h2>${g.name}</h2><p>${files.length} images, posts ${g.posts} · seed-images/${slug(g.name)}/</p><div class="grid">`;
  for (const f of files) html += `<figure><a href="${sources[f]?.page ?? "#"}"><img loading="lazy" src="${slug(g.name)}/${f}"></a><figcaption><b>${f}</b> ${sources[f]?.title?.slice(0, 60) ?? ""}</figcaption></figure>`;
  html += `</div>`;
}
await Bun.write(`${ROOT}/index.html`, html);

// What the seed uses: each gallery's images still in its folder, by where they came from.
const images: Record<string, Found[]> = {};
for (const g of GALLERIES) {
  const dir = `${ROOT}/${slug(g.name)}`;
  if (!(await Bun.file(`${dir}/sources.json`).exists())) continue;
  const sources = (await Bun.file(`${dir}/sources.json`).json()) as Record<string, Found>;
  const files = new Set(await readdir(dir));
  images[g.name] = Object.entries(sources).filter(([f]) => files.has(f)).map(([, found]) => found);
}
await Bun.write(`${import.meta.dir}/../src/seed.images.json`, JSON.stringify(images, null, 1) + "\n");
console.log(`review: open seed-images/index.html`);
