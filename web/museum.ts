// The museum's layout: every place a visitor can go, and what lies before and after each.
// The order is the walk; floorplan.ts lays the same rooms out as a building, and pages only use
// rooms() and neighbours(), so the drawing can change without them.
import { WING_MIN_PERIOD, client, seasonPhase } from "./api.ts";

export type RoomKind = "entrance" | "home" | "wing" | "gallery" | "nominations" | "archive";

export interface Room {
  id: string;
  kind: RoomKind;
  label: string;
  to: string; // where entering the room goes
  postTo?: string; // where posting to the room goes, for galleries and wings
  notice?: "new" | "ending soon"; // a gallery or wing whose season just started or ends soon
}

/**
 * Every room in walking order: entrance, home, open wings, open galleries (each oldest first),
 * future galleries, archive. Closed galleries and wings live in the archive instead.
 */
export async function rooms(now = Date.now()): Promise<Room[]> {
  const result = await client.groups.list({});
  const open = "error" in result ? [] : result.list.groups.filter((g) => g.run != null);
  const room = (g: (typeof open)[number], kind: "wing" | "gallery"): Room => {
    const phase = seasonPhase(g, now);
    const notice = phase === "new" ? "new" : phase === "ending" ? "ending soon" : undefined;
    return { id: g.group, kind, label: g.name, to: `/galleries/${g.group}`, postTo: `/galleries/${g.group}/post`, notice };
  };
  return [
    { id: "entrance", kind: "entrance", label: "entrance", to: "/" },
    { id: "home", kind: "home", label: "home", to: "/home" },
    ...open.filter((g) => g.period! >= WING_MIN_PERIOD).map((g) => room(g, "wing")),
    ...open.filter((g) => g.period! < WING_MIN_PERIOD).map((g) => room(g, "gallery")),
    { id: "nominations", kind: "nominations", label: "future galleries", to: "/nominations" },
    { id: "archive", kind: "archive", label: "archive", to: "/archive" },
  ];
}

/** The room a page is in, if it is one: home, a gallery or wing, future galleries, or anywhere in the archive. */
export function roomAt(path: string): string | null {
  if (path === "/home") return "home";
  if (path === "/nominations") return "nominations";
  if (path === "/archive" || path.startsWith("/archive/")) return "archive";
  return path.match(/^\/galleries\/([^/]+)$/)?.[1] ?? null;
}

/** The rooms directly before and after a room. Lists allow forks, which a map may add later. */
export function neighbours(all: Room[], id: string): { before: Room[]; after: Room[] } {
  const at = all.findIndex((r) => r.id === id);
  if (at === -1) return { before: [], after: [] };
  return { before: all.slice(Math.max(0, at - 1), at), after: all.slice(at + 1, at + 2) };
}
