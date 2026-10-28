<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { plan, ringPath, type PlacedRoom } from "../floorplan.ts";
import type { Room } from "../museum.ts";

// The museum drawn from above as a floor plan: outlines, doorways, and text labels. Every
// room is a link, so clicking, tabbing, and screen readers all reach it. Drag (or swipe) to
// look around; scroll, pinch, or the buttons to zoom; arrow keys and +/− do the same.
// `here` marks a room "you are here" and opens the view on it; `mini` is the small, still "you are here"
// version a gallery page shows, with no links of its own.
const props = defineProps<{ rooms: Room[]; here?: string; mini?: boolean }>();

const LINE = 16; // label line height
const MAX_ZOOM = 3;
const DRAG = 5; // pixels a pointer moves before it counts as dragging rather than clicking
const STEP = 80; // pixels an arrow key moves the view
const MINI_ZOOM = 0.7;
const p = computed(() => plan(props.rooms));

// ---------- the view: which plan point sits at the centre, and how many pixels per unit ----------

const svg = ref<SVGSVGElement>();
const size = ref({ w: 800, h: 600 }); // the drawing's size on screen, measured once mounted
const view = ref({ cx: 0, cy: 0, k: 1 });
const dragging = ref(false);

const fit = () => Math.min(size.value.w / p.value.bounds.w, size.value.h / p.value.bounds.h);
const minZoom = () => Math.min(fit() * 0.9, 1);
function clamp({ cx, cy, k }: { cx: number; cy: number; k: number }) {
  const { x, y, w, h } = p.value.bounds;
  const zoom = Math.min(Math.max(k, minZoom()), MAX_ZOOM);
  return { cx: Math.min(Math.max(cx, x), x + w), cy: Math.min(Math.max(cy, y), y + h), k: zoom };
}
const viewBox = computed(() => {
  const { cx, cy, k } = view.value;
  const [w, h] = [size.value.w / k, size.value.h / k];
  return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
});

/**
 * Where the map opens: on the `here` room if there is one; else the whole building when it
 * fits legibly, or full size at the entrance (bottom left).
 */
function recenter() {
  const here = p.value.rooms.find((r) => r.room.id === props.here);
  if (here) {
    const { x, y } = center(here);
    return void (view.value = clamp({ cx: x, cy: y, k: props.mini ? MINI_ZOOM : 1 }));
  }
  const { x, y, w, h } = p.value.bounds;
  if (fit() >= 0.6) return void (view.value = clamp({ cx: x + w / 2, cy: y + h / 2, k: Math.min(fit(), 1) }));
  view.value = clamp({ cx: x + size.value.w / 2, cy: y + h - size.value.h / 2, k: 1 });
}
function pan(dx: number, dy: number) {
  const { cx, cy, k } = view.value;
  view.value = clamp({ cx: cx - dx / k, cy: cy - dy / k, k });
}
/** Zooms by `factor`, keeping the plan point under (sx, sy) (pixels from the drawing's corner) in place. */
function zoomAt(factor: number, sx = size.value.w / 2, sy = size.value.h / 2) {
  const { cx, cy, k } = view.value;
  const zoom = clamp({ cx, cy, k: k * factor }).k;
  const [ox, oy] = [sx - size.value.w / 2, sy - size.value.h / 2];
  view.value = clamp({ cx: cx + ox / k - ox / zoom, cy: cy + oy / k - oy / zoom, k: zoom });
}

let observer: ResizeObserver | undefined;
function measure() {
  const box = svg.value?.getBoundingClientRect();
  if (box?.width && box.height) size.value = { w: box.width, h: box.height };
}
onMounted(() => {
  measure();
  recenter();
  if (typeof ResizeObserver !== "undefined" && svg.value) {
    observer = new ResizeObserver(() => {
      measure();
      view.value = clamp(view.value);
    });
    observer.observe(svg.value);
  }
});
onBeforeUnmount(() => {
  observer?.disconnect();
  clearTimeout(settle);
  clearTimeout(dropping);
});
watch(() => props.rooms, recenter);

// ---------- pointers: one drags, two pinch ----------

const pointers = new Map<number, { x: number; y: number }>();
let travelled = 0;
const local = (e: { clientX: number; clientY: number }) => {
  const box = svg.value!.getBoundingClientRect();
  return { x: e.clientX - box.left, y: e.clientY - box.top };
};

function down(e: PointerEvent) {
  if (props.mini) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  pointers.set(e.pointerId, local(e));
  if (pointers.size === 1) [travelled, dragging.value] = [0, false];
}
function move(e: PointerEvent) {
  if (!props.mini) hover(e);
  const before = pointers.get(e.pointerId);
  if (!before) return;
  const now = local(e);
  pointers.set(e.pointerId, now);
  if (pointers.size === 1) {
    travelled += Math.abs(now.x - before.x) + Math.abs(now.y - before.y);
    if (!dragging.value && travelled > DRAG) {
      dragging.value = true;
      // Captured only once it's a drag, so a plain click still lands on the room under it.
      svg.value?.setPointerCapture?.(e.pointerId);
    }
    if (dragging.value) pan(now.x - before.x, now.y - before.y);
    return;
  }
  const other = [...pointers].find(([id]) => id !== e.pointerId)![1];
  const apart = (a: { x: number; y: number }) => Math.hypot(a.x - other.x, a.y - other.y);
  dragging.value = true;
  if (apart(before) > 0) zoomAt(apart(now) / apart(before), (now.x + other.x) / 2, (now.y + other.y) / 2);
}
function up(e: PointerEvent) {
  pointers.delete(e.pointerId);
}
/** A click that ends a drag isn't a click on a room. */
function click(e: MouseEvent) {
  if (!dragging.value) return;
  e.preventDefault();
  e.stopPropagation();
  dragging.value = false;
}
function wheel(e: WheelEvent) {
  if (props.mini) return; // the page scrolls past it instead
  e.preventDefault();
  const at = local(e);
  zoomAt(Math.exp(-e.deltaY * 0.002), at.x, at.y);
}

// ---------- keyboard ----------

const KEYS: Record<string, () => void> = {
  ArrowLeft: () => pan(STEP, 0),
  ArrowRight: () => pan(-STEP, 0),
  ArrowUp: () => pan(0, STEP),
  ArrowDown: () => pan(0, -STEP),
  "+": () => zoomAt(1.25),
  "=": () => zoomAt(1.25),
  "-": () => zoomAt(0.8),
};
function key(e: KeyboardEvent) {
  const act = KEYS[e.key];
  if (!act || e.metaKey || e.ctrlKey || e.altKey) return;
  e.preventDefault();
  act();
}
/** Tabbing to a room out of view brings it to the centre. (Not a click's focus: moving the room mid-click would lose the click.) */
function focus(e: FocusEvent) {
  if (pointers.size) return;
  const id = (e.target as Element).closest?.("a")?.getAttribute("data-room");
  const r = p.value.rooms.find((r) => r.room.id === id);
  if (!r) return;
  const { x, y } = center(r);
  const { cx, cy, k } = view.value;
  const [hw, hh] = [size.value.w / k / 2 - 60, size.value.h / k / 2 - 60];
  if (Math.abs(x - cx) > hw || Math.abs(y - cy) > hh) view.value = clamp({ cx: x, cy: y, k });
}

// ---------- the person ----------
// A little person hangs from the pointer wherever it goes on the map, swaying as it moves, and
// waits in the corner when it leaves. Clicking a room drops them into it, then enters it.
// Keyboard presses and new-tab clicks enter at once, like any link.

const router = useRouter();
const frame = ref<HTMLElement>();
const person = ref<{ x: number; y: number; tilt: number } | null>(null); // null: waiting in the corner
const landing = ref<string | null>(null); // the room they're dropping into
const DROP_MS = 350;
let settle: ReturnType<typeof setTimeout> | undefined;
let dropping: ReturnType<typeof setTimeout> | undefined;

function follow(e: MouseEvent) {
  if (landing.value || !frame.value) return;
  const box = frame.value.getBoundingClientRect();
  const x = e.clientX - box.left;
  const tilt = person.value ? Math.max(-50, Math.min(50, (person.value.x - x) * 2)) : 0;
  person.value = { x, y: e.clientY - box.top, tilt };
  clearTimeout(settle);
  settle = setTimeout(() => person.value && (person.value = { ...person.value, tilt: 0 }), 120);
}
function hover(e: PointerEvent) {
  if (e.pointerType !== "touch") follow(e);
}
function park() {
  if (!landing.value) person.value = null;
}
function enter(e: MouseEvent, room: Room, navigate: (e?: MouseEvent) => unknown) {
  const quick = e.detail === 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
  if (quick || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return navigate(e);
  e.preventDefault();
  follow(e); // where a tap landed, on screens without a pointer to follow
  landing.value = room.id;
  dropping = setTimeout(() => router.push(room.to), DROP_MS);
}

// ---------- labels ----------

const center = ({ shape }: PlacedRoom) =>
  shape.kind === "rect" ? { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 } : { x: shape.cx, y: shape.cy };
const isHere = (r: PlacedRoom) => r.room.id === props.here;
/** Where the first label line goes, so the label, badge, and "you are here" (with its pin above) sit centred in the room. */
function labelTop(r: PlacedRoom) {
  const lines = r.label.length + (r.room.notice ? 1 : 0) + (isHere(r) ? 1 : 0);
  return center(r).y - ((lines - 1) * LINE) / 2 + 4 + (isHere(r) ? 9 : 0);
}
const describe = (r: Room) =>
  [r.label, r.kind === "wing" || r.kind === "gallery" ? r.kind : null, r.notice].filter(Boolean).join(", ");
const badgeWidth = (notice: string) => notice.length * 6.6 + 10;
</script>

<template>
  <div ref="frame" :class="['plan-frame', { mini }]">
    <svg
      ref="svg"
      :class="['plan', { dragging, mini }]"
      :viewBox="viewBox"
      :role="mini ? undefined : 'group'"
      :tabindex="mini ? undefined : 0"
      :aria-hidden="mini ? 'true' : undefined"
      :aria-label="mini ? undefined : 'floor plan of the museum. arrow keys move around, plus and minus zoom.'"
      @pointerdown="down"
      @pointermove="move"
      @pointerleave="park"
      @pointerup="up"
      @pointercancel="up"
      @click.capture="click"
      @wheel="wheel"
      @keydown="key"
      @focusin="focus"
      @dragstart.prevent
    >
      <rect v-for="(row, i) in p.rows" :key="`row${i}`" :x="row.x" :y="row.y" :width="row.w" :height="row.h" class="wall" />
      <polyline v-for="(points, i) in p.halls" :key="`hall${i}`" :points="points.join(' ')" class="wall" />
      <g v-for="(turn, i) in p.turns" :key="`turn${i}`">
        <circle :cx="turn.shape.cx" :cy="turn.shape.cy" :r="turn.shape.r" class="floor" />
        <path :d="ringPath(turn.shape, turn.openings)" class="wall" />
      </g>

      <RouterLink v-for="r in p.rooms" :key="r.room.id" v-slot="{ href, navigate }" :to="r.room.to" custom>
        <!-- The mini version sits inside a link to the map, so its rooms aren't links. -->
        <component
          :is="mini ? 'g' : 'a'"
          v-bind="mini ? {} : { href, 'aria-label': describe(r.room), onClick: (e: MouseEvent) => enter(e, r.room, navigate) }"
          :class="['plan-room', `kind-${r.room.kind}`, { here: isHere(r), target: r.room.id === landing }]"
          :data-room="r.room.id"
        >
          <template v-if="r.shape.kind === 'rect'">
            <rect :x="r.shape.x" :y="r.shape.y" :width="r.shape.w" :height="r.shape.h" class="floor wall" />
          </template>
          <template v-else>
            <circle :cx="r.shape.cx" :cy="r.shape.cy" :r="r.shape.r" class="floor" />
            <path :d="ringPath(r.shape, r.openings)" class="wall" />
          </template>
          <text :x="center(r).x" :y="labelTop(r)" aria-hidden="true">
            <tspan v-for="(line, i) in r.label" :key="i" :x="center(r).x" :dy="i ? LINE : 0">{{ line }}</tspan>
          </text>
          <g
            v-if="r.room.notice"
            :class="['plan-badge', { ending: r.room.notice === 'ending soon' }]"
            :transform="`translate(${center(r).x} ${labelTop(r) + r.label.length * LINE})`"
            aria-hidden="true"
          >
            <rect :x="-badgeWidth(r.room.notice) / 2" y="-11" :width="badgeWidth(r.room.notice)" height="15" />
            <text y="0">{{ r.room.notice }}</text>
          </g>
          <g v-if="isHere(r)" class="you-are-here" aria-hidden="true">
            <g :transform="`translate(${center(r).x} ${labelTop(r) - 14})`">
              <path d="M0 0 C -4 -6 -6 -9 -6 -12 A 6 6 0 1 1 6 -12 C 6 -9 4 -6 0 0 Z" class="pin" />
              <circle cx="0" cy="-12" r="2.2" class="pin-dot" />
            </g>
            <text :x="center(r).x" :y="labelTop(r) + (r.label.length + (r.room.notice ? 1 : 0)) * LINE">you are here</text>
          </g>
        </component>
      </RouterLink>

      <line v-for="([a, b], i) in p.doors" :key="`door${i}`" :x1="a[0]" :y1="a[1]" :x2="b[0]" :y2="b[1]" class="door" />
    </svg>
    <template v-if="!mini">
      <p class="plan-controls">
        <button type="button" aria-label="zoom in" @click="zoomAt(1.25)">+</button>
        <button type="button" aria-label="zoom out" @click="zoomAt(0.8)">−</button>
        <button type="button" @click="recenter">recenter</button>
      </p>
      <div
        :class="['pegman', { roaming: person, landing }]"
        :style="person ? { left: `${person.x}px`, top: `${person.y}px`, transform: `rotate(${person.tilt}deg)` } : undefined"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 40" width="24" height="40">
          <circle cx="12" cy="8" r="5" />
          <path d="M12 13 V27 M12 27 L7 38 M12 27 L17 38 M12 17 L4 9 M12 17 L20 9" />
        </svg>
      </div>
    </template>
  </div>
</template>

<style scoped>
.plan-frame {
  position: relative;
  border: var(--line);
}
.plan {
  display: block;
  width: 100%;
  height: 70vh;
  font-family: var(--font);
  cursor: grab;
  touch-action: none; /* the map takes swipes and pinches, not the page */
  user-select: none;
  -webkit-user-select: none;
}
.plan.dragging {
  cursor: grabbing;
}
.plan:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: -2px;
}
.plan-frame.mini {
  border: 0;
  height: 100%;
}
.plan.mini {
  height: 100%;
  cursor: pointer;
}
/* The person: waiting in the corner, hanging from the pointer over the map, dropping into a room. */
.pegman {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 4px 8px;
  border: var(--line);
  background: var(--paper);
  line-height: 0;
  pointer-events: none;
}
.pegman svg circle {
  fill: var(--ink);
}
.pegman svg path {
  fill: none;
  stroke: var(--ink);
  stroke-width: 2.5;
  stroke-linecap: round;
}
.pegman.roaming {
  right: auto;
  bottom: auto;
  margin: -6px 0 0 -20px; /* the raised hands at the pointer */
  border-color: transparent;
  background: none;
  transform-origin: 50% 0;
  transition: transform 0.15s ease-out;
  z-index: 2;
}
.pegman.landing svg {
  animation: drop 0.35s ease-in forwards;
}
@keyframes drop {
  60% {
    transform: translateY(14px);
  }
  80% {
    transform: translateY(12px) scaleY(0.85);
  }
  100% {
    transform: translateY(14px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .pegman.roaming {
    transition: none;
  }
}
.plan-room:hover .floor {
  fill: var(--wash);
}
.plan-room.here:hover .floor {
  fill: var(--ink);
}
.you-are-here .pin {
  fill: var(--alert);
}
.you-are-here .pin-dot {
  fill: var(--paper);
}
.plan-room .you-are-here text {
  font-size: 11px;
  font-weight: 400;
}
.plan-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  margin: 0;
  display: flex;
  gap: 4px;
}
.plan-controls button {
  min-width: 2.2em;
}
.plan .wall {
  fill: none;
  stroke: var(--ink);
  stroke-width: 1.5px;
  vector-effect: non-scaling-stroke;
}
.plan .floor {
  fill: var(--paper);
}
/* A doorway: paper painted over the wall, leaving a gap. */
.plan .door {
  stroke: var(--paper);
  stroke-width: 4px;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.plan-room {
  text-decoration: none;
}
.plan-room text {
  font-size: 13px;
  text-anchor: middle;
  fill: var(--ink);
}
.plan-room.kind-gallery text,
.plan-room.kind-wing text {
  font-weight: 700;
}
.plan-room.kind-wing > text {
  font-size: 16px;
}
.plan-room:hover > text,
.plan-room:focus-visible > text {
  fill: var(--accent);
  text-decoration: underline;
}
.plan-room:focus-visible {
  outline: none;
}
.plan-room:focus-visible .wall {
  stroke-width: 3px;
}
.plan-room.here .floor {
  fill: var(--ink);
}
.plan-room.here text {
  fill: var(--paper);
}
.plan-room.target .floor {
  fill: var(--wash);
}
.plan-badge rect {
  fill: var(--paper);
  stroke: var(--ink);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
}
.plan-room .plan-badge text {
  font-size: 11px;
  font-weight: 400;
}
.plan-badge.ending rect {
  fill: var(--ink);
}
.plan-room .plan-badge.ending text {
  fill: var(--paper);
}
</style>
