import { flushPromises } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import { SLOT, SLOTS_PER_ROW, plan, ringPath, wrap, type Shape } from "../floorplan.ts";
import type { Room } from "../museum.ts";
import { rooms } from "../museum.ts";
import { fakeApi, groupRow, mountAppAt, signedInAs } from "./fake.ts";

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

  test("every hall has a floor: the outline along one of its walls and back along the other", () => {
    const p = plan(museum(0, 20)); // two turns, plus the halls to home and the entrance
    expect(p.corridors).toHaveLength(p.halls.length / 2);
    p.corridors.forEach((floor, i) => expect(floor).toEqual([...p.halls[2 * i]!, ...[...p.halls[2 * i + 1]!].reverse()]));
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

// The map is an overlay over the page you're on, opened from that page's mini map.
const groupsApi = () =>
  fakeApi({
    "/groups/list": () => ({
      list: {
        groups: [
          groupRow("g1", "Doodles", { runStart: new Date(Date.now() - 60_000).toISOString() }),
          groupRow("g2", "Night Walks"),
        ],
      },
    }),
    "/groups/feed": () => ({ feed: { posts: [] } }),
    "/nominations/categories": () => ({ list: { categories: [] } }),
    "/archive/galleries": () => ({ page: { groups: [] } }),
  });
/** Opens the map from the mini map of the page at `path`. */
async function openMap(path = "/galleries/g1") {
  groupsApi();
  const opened = await mountAppAt(path);
  await opened.wrapper.find(".minimap svg.plan").trigger("click"); // its floor, outside the rooms
  await flushPromises();
  return opened;
}
const overlay = (wrapper: any) => wrapper.find("dialog.map-overlay");
const isOpen = (wrapper: any) => (overlay(wrapper).element as HTMLDialogElement).open;

describe("the map", () => {
  test("draws every room as a link in walking order, with its kind and notice in the name", async () => {
    const { wrapper } = await openMap();
    const links = overlay(wrapper).findAll("svg.plan a.plan-room");
    expect(links.map((a: any) => [a.attributes("aria-label"), a.attributes("href")])).toEqual([
      ["entrance", "/"],
      ["home", "/home"],
      ["Doodles, gallery, new", "/galleries/g1"],
      ["Night Walks, gallery", "/galleries/g2"],
      ["future galleries", "/nominations"],
      ["archive", "/archive"],
    ]);
    expect(overlay(wrapper).find(".plan-badge").text()).toBe("new");
  });

  test("pins the room you're in, \"you are here\", and opens on the whole building, centred", async () => {
    const { wrapper } = await openMap("/galleries/g2");
    expect(isOpen(wrapper)).toBe(true);
    const room = overlay(wrapper).find('[data-room="g2"]');
    expect(room.classes()).toContain("here");
    expect(room.find(".you-are-here").text()).toBe("you are here");
    const [x, y, w, h] = box(wrapper);
    const bounds = plan(await rooms()).bounds;
    expect(x! + w! / 2).toBeCloseTo(bounds.x + bounds.w / 2);
    expect(y! + h! / 2).toBeCloseTo(bounds.y + bounds.h / 2);
  });

  test("choosing a room goes there and closes the map", async () => {
    const { wrapper, router } = await openMap();
    await overlay(wrapper).find('a.plan-room[href="/galleries/g2"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/galleries/g2");
    expect(isOpen(wrapper)).toBe(false);
  });

  test("the × button and a click on the dimmed page around it close it; the mini map opens it again", async () => {
    const { wrapper, router } = await openMap();
    await overlay(wrapper).find('button[aria-label="close the map"]').trigger("click");
    expect(isOpen(wrapper)).toBe(false);
    await wrapper.find(".minimap svg.plan").trigger("click");
    await flushPromises();
    expect(isOpen(wrapper)).toBe(true);
    await overlay(wrapper).trigger("click"); // the dialog itself, outside the panel
    expect(isOpen(wrapper)).toBe(false);
    expect(router.currentRoute.value.path).toBe("/galleries/g1"); // still on the same page
  });

  // happy-dom has no layout, so the drawing keeps its default 800×600 size.
  const box = (wrapper: any) => overlay(wrapper).find("svg.plan").attributes("viewBox").split(" ").map(Number);
  const pointer = (x: number, y: number) => ({ pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y });

  test("dragging moves the view, and the click that ends a drag doesn't enter a room", async () => {
    const { wrapper, router } = await openMap();
    const svg = overlay(wrapper).find("svg.plan");
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
    await overlay(wrapper).find('a.plan-room[href="/galleries/g2"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/galleries/g1");
  });

  test("scrolling zooms in and out, within limits; the buttons zoom and recenter", async () => {
    const { wrapper } = await openMap();
    const start = box(wrapper);
    await overlay(wrapper).find("svg.plan").trigger("wheel", { deltaY: -200, clientX: 400, clientY: 300 });
    expect(box(wrapper)[2]).toBeLessThan(start[2]!);
    for (let i = 0; i < 20; i++) await overlay(wrapper).find('button[aria-label="zoom in"]').trigger("click");
    expect(box(wrapper)[2]).toBeCloseTo(800 / 3); // at most 3×
    await overlay(wrapper).findAll("button").find((b: any) => b.text() === "recenter")!.trigger("click");
    expect(box(wrapper)).toEqual(start);
  });

  test("arrow keys move the view, + and − zoom", async () => {
    const { wrapper } = await openMap();
    const svg = overlay(wrapper).find("svg.plan");
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

describe("the little person", () => {
  const at = (x: number, y: number, pointerType = "mouse") => ({ pointerId: 1, pointerType, button: 0, clientX: x, clientY: y });
  const person = (wrapper: any) => overlay(wrapper).find(".pegman");
  const plan = (wrapper: any) => overlay(wrapper).find("svg.plan");
  const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

  test("waits in the corner, follows the pointer over the map, and goes back when it leaves", async () => {
    const { wrapper } = await openMap();
    expect(person(wrapper).classes()).not.toContain("roaming");
    await plan(wrapper).trigger("pointermove", at(300, 200));
    expect(person(wrapper).classes()).toContain("roaming");
    expect(person(wrapper).attributes("style")).toContain("left: 300px; top: 200px");
    await plan(wrapper).trigger("pointerleave");
    expect(person(wrapper).classes()).not.toContain("roaming");
  });

  test("a touch doesn't summon them; only a pointer that hovers does", async () => {
    const { wrapper } = await openMap();
    await plan(wrapper).trigger("pointermove", at(300, 200, "touch"));
    expect(person(wrapper).classes()).not.toContain("roaming");
  });

  test("clicking a room drops them into it, then enters it", async () => {
    const { wrapper, router } = await openMap();
    await overlay(wrapper).find('a[data-room="g2"]').trigger("click", { detail: 1, clientX: 300, clientY: 200 });
    expect(person(wrapper).classes()).toContain("landing");
    expect(overlay(wrapper).find('[data-room="g2"]').classes()).toContain("target");
    expect(router.currentRoute.value.path).toBe("/galleries/g1"); // still falling
    await wait(400);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/galleries/g2");
  });

  test("a keyboard press enters at once, like any link", async () => {
    const { wrapper, router } = await openMap();
    await overlay(wrapper).find('a[data-room="g2"]').trigger("click", { detail: 0 });
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/galleries/g2");
  });
});

describe("where you are, on every room's page", () => {
  test("a gallery's mini map marks it \"you are here\" under a MAP label; from the keyboard, Enter opens the map", async () => {
    groupsApi();
    const { wrapper } = await mountAppAt("/galleries/g1");
    const mini = wrapper.find(".minimap");
    expect(mini.find('[data-room="g1"]').classes()).toContain("here");
    expect(mini.find('[data-room="g1"] .you-are-here').text()).toBe("you are here");
    expect(mini.find('[data-room="g1"] .pin').exists()).toBe(true);
    expect(mini.find("svg").attributes("aria-hidden")).toBe("true");
    expect(mini.findAll("svg a").every((a) => a.attributes("tabindex") === "-1")).toBe(true); // the mini map itself is the one stop
    expect(mini.find(".pegman").exists()).toBe(false);
    expect(mini.find(".minimap-label").text()).toBe("Map");
    expect(mini.find(".minimap-label").element.tagName).toBe("SPAN"); // a label, not a control
    expect([mini.attributes("role"), mini.attributes("tabindex"), mini.attributes("aria-label")]).toEqual([
      "button",
      "0",
      "you are in Doodles. open the map",
    ]);
    expect(isOpen(wrapper)).toBe(false);
    await mini.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(isOpen(wrapper)).toBe(true);
  });

  test("the mini map pans when dragged; a click outside its rooms expands it, a click on a room goes there", async () => {
    groupsApi();
    const { wrapper, router } = await mountAppAt("/galleries/g1");
    const svg = wrapper.find(".minimap svg.plan");
    const view = () => svg.attributes("viewBox");
    const before = view();
    const at = (x: number, y: number) => ({ pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y });
    await svg.trigger("pointerdown", at(100, 100));
    await svg.trigger("pointermove", at(60, 80));
    await svg.trigger("pointerup", at(60, 80));
    expect(view()).not.toBe(before);
    await svg.trigger("click"); // the click ending the drag: nothing
    expect(isOpen(wrapper)).toBe(false);
    await svg.trigger("click"); // a plain click on the hatching
    await flushPromises();
    expect(isOpen(wrapper)).toBe(true);
    await overlay(wrapper).find('button[aria-label="close the map"]').trigger("click");
    await wrapper.find('.minimap a[data-room="g2"]').trigger("click", { detail: 1 });
    await flushPromises();
    expect([router.currentRoute.value.path, isOpen(wrapper)]).toEqual(["/galleries/g2", false]);
  });

  test.each([
    ["/home", "home", "entrance", "Doodles"],
    ["/nominations", "nominations", "Night Walks", "archive"],
    ["/archive", "archive", "future galleries", null],
    ["/galleries/g2", "g2", "Doodles", "future galleries"],
  ])("%s has the mini map and the rooms before and after", async (path, room, before, after) => {
    signedInAs(null);
    groupsApi();
    const { wrapper } = await mountAppAt(path);
    expect(wrapper.find(`.minimap [data-room="${room}"]`).classes()).toContain("here");
    expect(wrapper.find(".neighbours .before").text()).toBe(`← ${before}`);
    expect(wrapper.find(".neighbours .after").text()).toBe(after ? `${after} →` : "");
  });

  test("pages that aren't rooms have neither", async () => {
    groupsApi();
    const { wrapper } = await mountAppAt("/auth");
    expect([wrapper.find(".minimap").exists(), wrapper.find(".neighbours").exists()]).toEqual([false, false]);
  });

  test("the top bar's name goes back to the entrance", async () => {
    groupsApi();
    const { wrapper } = await mountAppAt("/galleries/g1");
    expect(wrapper.find("a.brand").attributes("href")).toBe("/");
  });
});
