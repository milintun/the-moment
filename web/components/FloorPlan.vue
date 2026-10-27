<script setup lang="ts">
import { computed } from "vue";
import { plan, ringPath, type PlacedRoom } from "../floorplan.ts";
import type { Room } from "../museum.ts";

// The museum drawn from above as a floor plan: outlines, doorways, and text labels. Every
// room is a link, so clicking, tabbing, and screen readers all reach it.
const props = defineProps<{ rooms: Room[] }>();

const LINE = 16; // label line height
const p = computed(() => plan(props.rooms));
const viewBox = computed(() => `${p.value.bounds.x} ${p.value.bounds.y} ${p.value.bounds.w} ${p.value.bounds.h}`);

const center = ({ shape }: PlacedRoom) =>
  shape.kind === "rect" ? { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 } : { x: shape.cx, y: shape.cy };
/** Where the first label line goes, so the label (and badge under it) sits centred in the room. */
const labelTop = (r: PlacedRoom) => center(r).y - ((r.label.length + (r.room.notice ? 1 : 0) - 1) * LINE) / 2 + 4;
const describe = (r: Room) =>
  [r.label, r.kind === "wing" || r.kind === "gallery" ? r.kind : null, r.notice].filter(Boolean).join(", ");
const badgeWidth = (notice: string) => notice.length * 6.6 + 10;
</script>

<template>
  <svg class="plan" :viewBox="viewBox" :style="{ maxWidth: `${p.bounds.w}px` }" role="group" aria-label="floor plan of the museum">
    <rect v-for="(row, i) in p.rows" :key="`row${i}`" :x="row.x" :y="row.y" :width="row.w" :height="row.h" class="wall" />
    <polyline v-for="(points, i) in p.halls" :key="`hall${i}`" :points="points.join(' ')" class="wall" />
    <g v-for="(turn, i) in p.turns" :key="`turn${i}`">
      <circle :cx="turn.shape.cx" :cy="turn.shape.cy" :r="turn.shape.r" class="floor" />
      <path :d="ringPath(turn.shape, turn.openings)" class="wall" />
    </g>

    <RouterLink v-for="r in p.rooms" :key="r.room.id" v-slot="{ href, navigate }" :to="r.room.to" custom>
      <a :href="href" :class="['plan-room', `kind-${r.room.kind}`]" :aria-label="describe(r.room)" @click="navigate">
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
</template>
