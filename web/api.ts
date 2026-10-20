import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import { ref } from "vue";
import type { TheMomentWireHttp } from "../generated/wire.ts";

export const client = createHttpClient<TheMomentWireHttp>({ baseUrl: "/api" });

export const WING_MIN_PERIOD = 30 * 24 * 60 * 60 * 1000; // a cycle of 30 days or longer makes a wing

// The signed-in username (null when signed out) and what they may do. Shared by every page.
export const me = ref<string | null>(null);
export const isAdmin = ref(false);
export const isOwner = ref(false);

/** Reloads who is signed in, and whether they are an admin or the owner. */
export async function refreshMe() {
  const current = await client.auth.current({});
  me.value = "error" in current ? null : current.username;
  // Only admins may list the admins, so a successful answer is the admin check.
  const admins = me.value ? await client.admin.admins.list({}) : { error: "signed out" };
  isAdmin.value = !("error" in admins);
  isOwner.value = !("error" in admins) && admins.list.admins.some((a) => a.user === me.value && a.owner);
}

/** Lowercase, trimmed, single-spaced: how the server decides two nominations name the same idea. */
export const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

/** The application's one nomination category; the server creates it at startup. */
export const FUTURE_GALLERIES = "Future galleries";

/** The seasons of a cycle that have fully ended, counting from 0, each with its dates. */
export function finishedSeasons(
  cycle: { start: string | null; period: number | null; runs: number | null },
  now = Date.now(),
): Array<{ season: number; start: Date; end: Date }> {
  if (cycle.start == null || cycle.period == null || cycle.runs == null) return [];
  const first = new Date(cycle.start).getTime();
  const seasons = [];
  for (let season = 0; season < cycle.runs; season++) {
    const end = first + (season + 1) * cycle.period;
    if (end > now) break;
    seasons.push({ season, start: new Date(end - cycle.period), end: new Date(end) });
  }
  return seasons;
}
