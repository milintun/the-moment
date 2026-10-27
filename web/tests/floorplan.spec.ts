import { flushPromises } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import { SLOT, SLOTS_PER_ROW, plan, ringPath, wrap, type Shape } from "../floorplan.ts";
import type { Room } from "../museum.ts";
import { fakeApi, groupRow, mountAt } from "./fake.ts";

/** Rooms as rooms() lists them, with `wings` wings and `galleries` galleries. */
function museum(wings: number, galleries: number): Room[] {
  const open = (kind: "wing" | "gallery", i: number): Room => ({ id: `${kind}${i}`, kind, label: `${kind} ${i}`, to: `/galleries/${kind}${i}` });
  return [
    { id: "entrance", kind: "entrance", label: "entrance", to: "/" },
    { id: "home", kind: "home", label: "home", to: "/home" },
    ...Array.from({ length: wings }, (_, i) => open("wing", i)),
    ...Array.from({ length: galleries }, (_, i) => open("gallery", i)),
    { id: "nominations", kind: "nominations", label: "future galleries", to: "/nominations" },
    { id: "archive", kind: "archive", label: "archive", to: "/archive" },
  ];
}
const box = (s: Shape) =>
  s.kind === "rect" ? { x0: s.x, y0: s.y, x1: s.x + s.w, y1: s.y + s.h } : { x0: s.cx - s.r, y0: s.cy - s.r, x1: s.cx + s.r, y1: s.cy + s.r };
const overlap = (a: Shape, b: Shape) => {
  const [p, q] = [box(a), box(b)];
  return Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0) > 0.01 && Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0) > 0.01;
};
const SIZES: Array<[number, number]> = [[0, 0], [0, 1], [0, 7], [1, 5], [3, 0], [2, 30], [5, 11]];

describe("plan", () => {
  test.each(SIZES)("%i wings and %i galleries: every room placed once, nothing overlapping, all inside the bounds", (wings, galleries) => {
    const all = museum(wings, galleries);
    const p = plan(all);
    expect(p.rooms.map((r) => r.room.id).sort()).toEqual(all.map((r) => r.id).sort());
    const shapes = [...p.rooms.map((r) => r.shape), ...p.turns.map((t) => t.shape)];
    shapes.forEach((a, i) => shapes.slice(i + 1).forEach((b) => expect(overlap(a, b)).toBe(false)));
    const { x, y, w, h } = p.bounds;
    for (const s of [...shapes, ...p.rows]) {
      const b = box(s);
      expect(b.x0 >= x && b.y0 >= y && b.x1 <= x + w && b.y1 <= y + h).toBe(true);
    }
  });

  test.each(SIZES)("%i wings and %i galleries: every room has a doorway in its wall", (wings, galleries) => {
    const p = plan(museum(wings, galleries));
    const onWall = (s: Shape, [x, y]: [number, number]) =>
      s.kind === "rect" &&
      (((x === s.x || x === s.x + s.w) && y >= s.y && y <= s.y + s.h) || ((y === s.y || y === s.y + s.h) && x >= s.x && x <= s.x + s.w));
    for (const r of p.rooms) {
      const hasDoor = r.shape.kind === "circle" ? r.openings.length > 0 : p.doors.some(([a, b]) => onWall(r.shape, a) && onWall(r.shape, b));
      expect({ room: r.room.id, hasDoor }).toEqual({ room: r.room.id, hasDoor: true });
    }
  });

  test("the start is fixed: the entrance is the lowest room, under home, whatever the museum holds", () => {
    for (const [wings, galleries] of SIZES) {
      const p = plan(museum(wings, galleries));
      const at = (id: string) => box(p.rooms.find((r) => r.room.id === id)!.shape);
      expect(at("entrance").y1).toBe(Math.max(...p.rooms.map((r) => box(r.shape).y1)));
      expect(at("home")).toEqual(box(plan(museum(0, 0)).rooms.find((r) => r.room.id === "home")!.shape));
      expect(at("home").y1).toBeLessThanOrEqual(at("entrance").y0);
    }
  });

  test("the end follows the last row: future galleries at its end, the archive beyond", () => {
    for (const [wings, galleries] of SIZES) {
      const p = plan(museum(wings, galleries));
      const top = Math.min(...p.rows.map((r) => r.y));
      const lastRow = p.rows.find((r) => r.y === top)!;
      const nominations = box(p.rooms.find((r) => r.room.id === "nominations")!.shape);
      const archive = box(p.rooms.find((r) => r.room.id === "archive")!.shape);
      // Beside the last row's end, at its corridor; the archive directly above.
      expect(nominations.x0 === lastRow.x + lastRow.w || nominations.x1 === lastRow.x).toBe(true);
      expect(archive.y1).toBe(nominations.y0);
      expect(archive.x0).toBe(nominations.x0);
    }
  });

  test("the corridor winds: rows of four slots, alternate rows running back, a turning rotunda between each", () => {
    const p = plan(museum(0, 20)); // 10 pairs: rows of 4, 4, 2
    expect(p.rows.map((r) => r.w / SLOT)).toEqual([SLOTS_PER_ROW, SLOTS_PER_ROW, 2]);
    expect(p.turns).toHaveLength(2);
    expect(p.turns[0]!.shape.cx).toBeGreaterThan(SLOTS_PER_ROW * SLOT); // first turn on the right
    expect(p.turns[1]!.shape.cx).toBeLessThan(0); // then on the left
  });

  test("a wing is a hall two slots wide, as deep as the whole row; galleries pair up across the corridor", () => {
    const p = plan(museum(1, 2));
    const [wing, a, b] = ["wing0", "gallery0", "gallery1"].map((id) => p.rooms.find((r) => r.room.id === id)!.shape);
    expect(wing).toMatchObject({ w: 2 * SLOT, h: p.rows[0]!.h });
    expect(box(a!).x0).toBe(box(b!).x0);
    expect(box(a!).y0).toBeGreaterThan(box(b!).y1);
  });

  test("the same rooms always give the same plan; more galleries keep earlier rooms where they were", () => {
    expect(plan(museum(1, 9))).toEqual(plan(museum(1, 9)));
    const before = plan(museum(1, 9)).rooms.find((r) => r.room.id === "gallery4")!.shape;
    expect(plan(museum(1, 12)).rooms.find((r) => r.room.id === "gallery4")!.shape).toEqual(before);
  });
});

describe("wrap", () => {
  test("fits words to lines, at most two, cut short with …", () => {
    expect(wrap("night walks", 13)).toEqual(["night walks"]);
    expect(wrap("self portraits", 13)).toEqual(["self", "portraits"]);
    expect(wrap("rainy days in the city of boston", 13)).toEqual(["rainy days in", "the city of…"]);
    expect(wrap("supercalifragilistic", 8)).toEqual(["supercal", "ifragil…"]);
  });
});

describe("ringPath", () => {
  test("a whole circle without openings, one arc per gap between openings", () => {
    const c = { kind: "circle" as const, cx: 0, cy: 0, r: 40 };
    expect(ringPath(c, []).match(/A/g)).toHaveLength(2);
    expect(ringPath(c, [0, Math.PI / 2]).match(/M/g)).toHaveLength(2);
  });
});

describe("the map page", () => {
  const page = () =>
    fakeApi({
      "/groups/list": () => ({
        list: {
          groups: [
            groupRow("g1", "Doodles", { runStart: new Date(Date.now() - 60_000).toISOString() }),
            groupRow("g2", "Night Walks"),
          ],
        },
      }),
    });

  test("draws every room as a link in walking order, with its kind and notice in the name", async () => {
    page();
    const { wrapper } = await mountAt("/map");
    const links = wrapper.findAll("svg.plan a.plan-room");
    expect(links.map((a) => [a.attributes("aria-label"), a.attributes("href")])).toEqual([
      ["entrance", "/"],
      ["home", "/home"],
      ["Doodles, gallery, new", "/galleries/g1"],
      ["Night Walks, gallery", "/galleries/g2"],
      ["future galleries", "/nominations"],
      ["archive", "/archive"],
    ]);
    expect(wrapper.find(".plan-badge").text()).toBe("new");
  });

  test("clicking a room enters it", async () => {
    page();
    const { wrapper, router } = await mountAt("/map");
    await wrapper.find('a.plan-room[href="/galleries/g2"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/galleries/g2");
  });

  test("list view shows the same rooms as a list, and back", async () => {
    page();
    const { wrapper } = await mountAt("/map");
    await wrapper.find(".lede button").trigger("click");
    expect(wrapper.find("svg.plan").exists()).toBe(false);
    expect(wrapper.findAll(".rooms .room")).toHaveLength(6);
    await wrapper.find(".lede button").trigger("click");
    expect(wrapper.find("svg.plan").exists()).toBe(true);
  });

  // happy-dom has no layout, so the drawing keeps its default 800×600 size.
  const box = (wrapper: any) => wrapper.find("svg.plan").attributes("viewBox").split(" ").map(Number);
  const pointer = (x: number, y: number) => ({ pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y });

  test("dragging moves the view, and the click that ends a drag doesn't enter a room", async () => {
    page();
    const { wrapper, router } = await mountAt("/map");
    const svg = wrapper.find("svg.plan");
    const [x0, y0, w] = box(wrapper);
    const k = 800 / w;
    await svg.trigger("pointerdown", pointer(100, 100));
    await svg.trigger("pointermove", pointer(103, 100)); // not yet a drag
    expect(box(wrapper)[0]).toBe(x0);
    await svg.trigger("pointermove", pointer(80, 90));
    expect(svg.classes()).toContain("dragging");
    expect(box(wrapper)[0]).toBeCloseTo(x0 + 23 / k); // moved from where the last move left it
    expect(box(wrapper)[1]).toBeCloseTo(y0 + 10 / k);
    await svg.trigger("pointerup", pointer(80, 90));
    await wrapper.find('a.plan-room[href="/galleries/g2"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/map");
  });

  test("scrolling zooms in and out, within limits; the buttons zoom and recenter", async () => {
    page();
    const { wrapper } = await mountAt("/map");
    const start = box(wrapper);
    await wrapper.find("svg.plan").trigger("wheel", { deltaY: -200, clientX: 400, clientY: 300 });
    expect(box(wrapper)[2]).toBeLessThan(start[2]!);
    for (let i = 0; i < 20; i++) await wrapper.find('button[aria-label="zoom in"]').trigger("click");
    expect(box(wrapper)[2]).toBeCloseTo(800 / 3); // at most 3×
    await wrapper.findAll("button").find((b) => b.text() === "recenter")!.trigger("click");
    expect(box(wrapper)).toEqual(start);
  });

  test("arrow keys move the view, + and − zoom", async () => {
    page();
    const { wrapper } = await mountAt("/map");
    const svg = wrapper.find("svg.plan");
    const [, , w0] = box(wrapper);
    await svg.trigger("keydown", { key: "+" });
    const [, , w1] = box(wrapper);
    expect(w1).toBeCloseTo(w0! / 1.25);
    const [x1] = box(wrapper);
    await svg.trigger("keydown", { key: "ArrowRight" });
    expect(box(wrapper)[0]).toBeGreaterThan(x1!);
    await svg.trigger("keydown", { key: "-" });
    expect(box(wrapper)[2]).toBeCloseTo(w0!);
  });
});
