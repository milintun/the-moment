<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { plan, ringPath, type PlacedRoom } from "../floorplan.ts";
import type { Room } from "../museum.ts";

// The museum drawn from above as a floor plan: outlines, doorways, and text labels. Every
// room is a link, so clicking, tabbing, and screen readers all reach it. Drag (or swipe) to
// look around; scroll, pinch, or the buttons to zoom; arrow keys and +/− do the same.
const props = defineProps<{ rooms: Room[] }>();

const LINE = 16; // label line height
const MAX_ZOOM = 3;
const DRAG = 5; // pixels a pointer moves before it counts as dragging rather than clicking
const STEP = 80; // pixels an arrow key moves the view
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

/** Where the map opens: the whole building when it fits legibly, else full size at the entrance (bottom left). */
function recenter() {
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
onBeforeUnmount(() => observer?.disconnect());

// ---------- pointers: one drags, two pinch ----------

const pointers = new Map<number, { x: number; y: number }>();
let travelled = 0;
const local = (e: { clientX: number; clientY: number }) => {
  const box = svg.value!.getBoundingClientRect();
  return { x: e.clientX - box.left, y: e.clientY - box.top };
};

function down(e: PointerEvent) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  pointers.set(e.pointerId, local(e));
  if (pointers.size === 1) [travelled, dragging.value] = [0, false];
}
function move(e: PointerEvent) {
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
/** Tabbing to a room out of view brings it to the centre. */
function focus(e: FocusEvent) {
  const id = (e.target as Element).closest?.("a")?.getAttribute("data-room");
  const r = p.value.rooms.find((r) => r.room.id === id);
  if (!r) return;
  const { x, y } = center(r);
  const { cx, cy, k } = view.value;
  const [hw, hh] = [size.value.w / k / 2 - 60, size.value.h / k / 2 - 60];
  if (Math.abs(x - cx) > hw || Math.abs(y - cy) > hh) view.value = clamp({ cx: x, cy: y, k });
}

// ---------- labels ----------

const center = ({ shape }: PlacedRoom) =>
  shape.kind === "rect" ? { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 } : { x: shape.cx, y: shape.cy };
/** Where the first label line goes, so the label (and badge under it) sits centred in the room. */
const labelTop = (r: PlacedRoom) => center(r).y - ((r.label.length + (r.room.notice ? 1 : 0) - 1) * LINE) / 2 + 4;
const describe = (r: Room) =>
  [r.label, r.kind === "wing" || r.kind === "gallery" ? r.kind : null, r.notice].filter(Boolean).join(", ");
const badgeWidth = (notice: string) => notice.length * 6.6 + 10;
</script>

<template>
  <div class="plan-frame">
    <svg
      ref="svg"
      :class="['plan', { dragging }]"
      :viewBox="viewBox"
      role="group"
      tabindex="0"
      aria-label="floor plan of the museum. arrow keys move around, plus and minus zoom."
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
      @click.capture="click"
      @wheel.prevent="wheel"
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
        <a :href="href" :class="['plan-room', `kind-${r.room.kind}`]" :data-room="r.room.id" :aria-label="describe(r.room)" @click="navigate">
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
        </a>
      </RouterLink>

      <line v-for="([a, b], i) in p.doors" :key="`door${i}`" :x1="a[0]" :y1="a[1]" :x2="b[0]" :y2="b[1]" class="door" />
    </svg>
    <p class="plan-controls">
      <button type="button" aria-label="zoom in" @click="zoomAt(1.25)">+</button>
      <button type="button" aria-label="zoom out" @click="zoomAt(0.8)">−</button>
      <button type="button" @click="recenter">recenter</button>
    </p>
  </div>
</template>
