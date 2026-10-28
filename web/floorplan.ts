// The floor plan: where every room sits, as plain geometry in SVG units (y grows downward).
// The building has a fixed start (entrance, then the home rotunda) and a fixed end (future
// galleries, then the archive). Between them a corridor winds back and forth in rows, built
// from units: a corridor stretch with a gallery on each side, or a wing hall twice as wide that
// the corridor runs through. At the end of each row a small rotunda turns the corridor into
// the next row, one level up. More galleries add units; the start and end never move.
import type { Room } from "./museum.ts";

export type Point = [number, number];
export type Segment = [Point, Point];
export type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "circle"; cx: number; cy: number; r: number };
type Rect = Extract<Shape, { kind: "rect" }>;
type Circle = Extract<Shape, { kind: "circle" }>;

export interface PlacedRoom {
  room: Room;
  shape: Shape;
  /** The label, wrapped to fit the room. */
  label: string[];
  /** Directions (radians, 0 = right, π/2 = down) of the doorways in a round room's wall. */
  openings: number[];
}

export interface Plan {
  rooms: PlacedRoom[];
  /** The outer walls of each row of the corridor. */
  rows: Rect[];
  /** Round rooms where the corridor turns; they hold nothing. */
  turns: Array<{ shape: Circle; openings: number[] }>;
  /** Open wall lines of the halls joining the parts, in pairs: one wall, then the one across from it. */
  halls: Point[][];
  /** The floor of each hall: the outline between a pair of its walls. */
  corridors: Point[][];
  /** Doorways in straight walls, painted over the wall to leave a gap. */
  doors: Segment[];
  bounds: { x: number; y: number; w: number; h: number };
}

export const SLOT = 120; // width of a corridor unit; a wing takes two
export const SLOTS_PER_ROW = 4;
const GALLERY = 90; // depth of a gallery off the corridor
const HALL = 40; // width of the corridor and halls
const ROW = GALLERY + HALL + GALLERY;
const PITCH = ROW + 60; // from one row's corridor to the next
const COLUMN = 140; // width of the columns either side of the rows (start, turns, end)
const HOME_R = 60;
const TURN_R = 40;
const DOOR = 24; // a gallery's doorway
const PAD = 30;

const h = HALL / 2;
const UP = -Math.PI / 2;
const DOWN = Math.PI / 2;

/** Words wrapped into at most `lines` lines of at most `width` characters, cut short with "…". */
export function wrap(text: string, width: number, lines = 2): string[] {
  const words = text
    .trim()
    .split(/\s+/)
    .flatMap((word) => word.match(new RegExp(`.{1,${width}}`, "g")) ?? []);
  const out: string[] = [];
  for (const word of words) {
    const last = out.at(-1);
    if (last != null && last.length + 1 + word.length <= width) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  if (out.length <= lines) return out;
  const kept = out.slice(0, lines);
  const end = kept[lines - 1]!;
  kept[lines - 1] = `${end.length < width ? end : end.slice(0, width - 1)}…`;
  return kept;
}

type Unit = { kind: "wing"; room: Room } | { kind: "pair"; rooms: Room[] };

/** The plan for rooms as rooms() lists them: entrance, home, wings, galleries, future galleries, archive. */
export function plan(all: Room[]): Plan {
  const find = (kind: Room["kind"]) => all.find((r) => r.kind === kind)!;
  const placed: PlacedRoom[] = [];
  const rows: Rect[] = [];
  const turns: Plan["turns"] = [];
  const halls: Point[][] = [];
  const doors: Segment[] = [];
  const put = (room: Room, shape: Shape, width: number, openings: number[] = []) =>
    placed.push({ room, shape, label: wrap(room.label, width), openings });

  // ---------- the winding middle ----------
  const units: Unit[] = all.filter((r) => r.kind === "wing").map((room) => ({ kind: "wing", room }));
  const galleries = all.filter((r) => r.kind === "gallery");
  for (let i = 0; i < galleries.length; i += 2) units.push({ kind: "pair", rooms: galleries.slice(i, i + 2) });

  // Each unit's row and first slot, filling rows in walking order.
  const spots: Array<{ unit: Unit; row: number; slot: number }> = [];
  let row = 0;
  let slot = 0;
  for (const unit of units) {
    const width = unit.kind === "wing" ? 2 : 1;
    if (slot + width > SLOTS_PER_ROW) [row, slot] = [row + 1, 0];
    spots.push({ unit, row, slot });
    slot += width;
  }
  const lastRow = row;
  const lastWidth = Math.max(slot, 1); // an empty museum still has a stretch of corridor
  const rightward = (r: number) => r % 2 === 0;
  const corridorY = (r: number) => -r * PITCH;
  const widthOf = (r: number) => (r === lastRow ? lastWidth : SLOTS_PER_ROW);
  /** The row's left and right ends. Rightward rows start at 0; leftward ones end at the full width. */
  const extent = (r: number): [number, number] =>
    rightward(r) ? [0, widthOf(r) * SLOT] : [(SLOTS_PER_ROW - widthOf(r)) * SLOT, SLOTS_PER_ROW * SLOT];

  for (let r = 0; r <= lastRow; r++) {
    const [x0, x1] = extent(r);
    const y = corridorY(r);
    rows.push({ kind: "rect", x: x0, y: y - ROW / 2, w: x1 - x0, h: ROW });
    doors.push([[x0, y - h], [x0, y + h]], [[x1, y - h], [x1, y + h]]);
  }

  for (const { unit, row: r, slot: s } of spots) {
    const width = unit.kind === "wing" ? 2 : 1;
    const x = rightward(r) ? s * SLOT : (SLOTS_PER_ROW - s - width) * SLOT;
    const y = corridorY(r);
    if (unit.kind === "wing") {
      // The corridor runs straight through the wing.
      put(unit.room, { kind: "rect", x, y: y - ROW / 2, w: 2 * SLOT, h: ROW }, 26);
      doors.push([[x, y - h], [x, y + h]], [[x + 2 * SLOT, y - h], [x + 2 * SLOT, y + h]]);
      continue;
    }
    // The first of the pair on the near side (below the corridor), the second across from it.
    unit.rooms.forEach((room, i) => {
      const wall = i === 0 ? y + h : y - h;
      put(room, { kind: "rect", x, y: i === 0 ? wall : wall - GALLERY, w: SLOT, h: GALLERY }, 13);
      doors.push([[x + SLOT / 2 - DOOR / 2, wall], [x + SLOT / 2 + DOOR / 2, wall]]);
    });
  }

  // Turns: at the end of each row, a hall bends up into the next row through a small rotunda.
  for (let r = 0; r < lastRow; r++) {
    const right = rightward(r);
    const edge = right ? SLOTS_PER_ROW * SLOT : 0;
    const out = right ? 1 : -1; // away from the rows
    const xc = edge + (out * COLUMN) / 2;
    const [y1, y2] = [corridorY(r), corridorY(r + 1)];
    halls.push(
      [[edge, y1 + h], [xc + out * h, y1 + h], [xc + out * h, y2 - h], [edge, y2 - h]],
      [[edge, y1 - h], [xc - out * h, y1 - h], [xc - out * h, y2 + h], [edge, y2 + h]],
    );
    turns.push({ shape: { kind: "circle", cx: xc, cy: (y1 + y2) / 2, r: TURN_R }, openings: [UP, DOWN] });
  }

  // ---------- the fixed start: entrance below the home rotunda, left of the first row ----------
  const homeX = -COLUMN / 2;
  put(find("home"), { kind: "circle", cx: homeX, cy: 0, r: HOME_R }, 12, [0, DOWN]);
  halls.push([[homeX, -h], [0, -h]], [[homeX, h], [0, h]]);
  const entranceTop = HOME_R + 30;
  halls.push([[homeX - h, 0], [homeX - h, entranceTop]], [[homeX + h, 0], [homeX + h, entranceTop]]);
  put(find("entrance"), { kind: "rect", x: homeX - 70, y: entranceTop, w: 140, h: 56 }, 16);
  doors.push([[homeX - h, entranceTop], [homeX + h, entranceTop]], [[homeX - h, entranceTop + 56], [homeX + h, entranceTop + 56]]);

  // ---------- the fixed end: future galleries past the last row, the archive beyond it ----------
  const [x0, x1] = extent(lastRow);
  const endX = rightward(lastRow) ? x1 : x0 - COLUMN;
  const y = corridorY(lastRow);
  put(find("nominations"), { kind: "rect", x: endX, y: y - 60, w: COLUMN, h: 120 }, 16);
  put(find("archive"), { kind: "rect", x: endX, y: y - 150, w: COLUMN, h: 90 }, 16);
  doors.push([[endX + COLUMN / 2 - h, y - 60], [endX + COLUMN / 2 + h, y - 60]]);

  // ---------- bounds ----------
  const xs: number[] = [];
  const ys: number[] = [];
  for (const shape of [...placed.map((p) => p.shape), ...rows, ...turns.map((t) => t.shape)]) {
    if (shape.kind === "rect") xs.push(shape.x, shape.x + shape.w), ys.push(shape.y, shape.y + shape.h);
    else xs.push(shape.cx - shape.r, shape.cx + shape.r), ys.push(shape.cy - shape.r, shape.cy + shape.r);
  }
  for (const [x, yy] of halls.flat()) xs.push(x), ys.push(yy);
  const [minX, minY] = [Math.min(...xs) - PAD, Math.min(...ys) - PAD];
  const bounds = { x: minX, y: minY, w: Math.max(...xs) + PAD - minX, h: Math.max(...ys) + PAD - minY };

  // Each hall's floor: along one wall and back along the other.
  const corridors: Point[][] = [];
  for (let i = 0; i < halls.length; i += 2) corridors.push([...halls[i]!, ...[...halls[i + 1]!].reverse()]);

  // In walking order, so tabbing through the plan walks the museum.
  placed.sort((a, b) => all.indexOf(a.room) - all.indexOf(b.room));
  return { rooms: placed, rows, turns, halls, corridors, doors, bounds };
}

/** An SVG path for a circle's wall, leaving a corridor-wide gap at each opening. */
export function ringPath(c: Circle, openings: number[]): string {
  const at = (a: number) => `${c.cx + c.r * Math.cos(a)} ${c.cy + c.r * Math.sin(a)}`;
  if (!openings.length) return `M ${at(0)} A ${c.r} ${c.r} 0 1 1 ${at(Math.PI)} A ${c.r} ${c.r} 0 1 1 ${at(0)}`;
  const gap = Math.asin(h / c.r);
  const sorted = [...openings].sort((a, b) => a - b);
  return sorted
    .map((a, i) => {
      const from = a + gap;
      const to = (i + 1 < sorted.length ? sorted[i + 1]! : sorted[0]! + 2 * Math.PI) - gap;
      return `M ${at(from)} A ${c.r} ${c.r} 0 ${to - from > Math.PI ? 1 : 0} 1 ${at(to)}`;
    })
    .join(" ");
}
