import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import { onUnmounted, ref } from "vue";
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

/** The first name that repeats an earlier one, normalized, if any. */
export function repeatedName(names: string[]) {
  const normalized = names.map(normalizeName);
  return normalized.find((name, i) => normalized.indexOf(name) !== i);
}

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

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How long a season counts as new after it starts, and ending soon before it ends: 20% of it, at most a day. */
export const noticeWindow = (period: number) => Math.min(0.2 * period, DAY);

/**
 * Where the season running at `runStart`..`runEnd` stands at `now`: "new" early on, "ending"
 * near its end, "open" in between, and "ended" once it is over (for a page left open across
 * the end). Null when no season is running.
 */
export function seasonPhase(
  g: { runStart: string | null; runEnd: string | null },
  now = Date.now(),
): "new" | "open" | "ending" | "ended" | null {
  if (g.runStart == null || g.runEnd == null) return null;
  const start = new Date(g.runStart).getTime();
  const end = new Date(g.runEnd).getTime();
  const window = noticeWindow(end - start);
  if (now >= end) return "ended";
  if (now - start < window) return "new";
  if (end - now <= window) return "ending";
  return "open";
}

/** A short span of time: "less than a minute", "12 min", "5h", "3 days". */
export function span(ms: number): string {
  if (ms < MINUTE) return "less than a minute";
  if (ms < HOUR) return `${Math.round(ms / MINUTE)} min`;
  if (ms < 2 * DAY) return `${Math.round(ms / HOUR)}h`;
  return `${Math.round(ms / DAY)} days`;
}

export type WallSort = "votes" | "newest" | "oldest";

/**
 * An art wall in the order chosen: as it came (most votes first, newest first among ties),
 * newest first, or oldest first.
 */
export function wallOrder<T extends { createdAt: string }>(posts: T[], order: WallSort): T[] {
  if (order === "votes") return posts;
  const time = (p: T) => new Date(p.createdAt).getTime();
  return [...posts].sort((a, b) => (order === "newest" ? time(b) - time(a) : time(a) - time(b)));
}

/** A moment as a day and an hour: "monday 10/26 at 1am", "sunday 11/1 at 11:30pm". */
export function dayAndHour(when: string | Date): string {
  const d = new Date(when);
  const weekday = d.toLocaleDateString([], { weekday: "long" });
  const hour = d.getHours() % 12 || 12;
  const minutes = d.getMinutes() ? `:${String(d.getMinutes()).padStart(2, "0")}` : "";
  return `${weekday} ${d.getMonth() + 1}/${d.getDate()} at ${hour}${minutes}${d.getHours() < 12 ? "am" : "pm"}`;
}

/** The current time, updated every minute while the component using it is on screen. */
export function useNow() {
  const now = ref(Date.now());
  const timer = setInterval(() => (now.value = Date.now()), MINUTE);
  onUnmounted(() => clearInterval(timer));
  return now;
}
