<script setup lang="ts">
import { computed, provide, ref, watch } from "vue";
import { useRoute } from "vue-router";
import FloorPlan from "./components/FloorPlan.vue";
import { theme, toggleTheme } from "./theme.ts";
import { neighbours, roomAt, rooms, type Room } from "./museum.ts";

const route = useRoute();
// The entrance is a full-screen landing page with its own account link.
const atEntrance = computed(() => route.path === "/");

// Every room's page shows where it is: a mini map marking it, and the rooms before and after.
const here = computed(() => roomAt(route.path));
const all = ref<Room[]>([]);
watch(
  here,
  async (room) => {
    if (room) all.value = await rooms();
  },
  { immediate: true },
);
const current = computed(() => all.value.find((r) => r.id === here.value));
const around = computed(() => (current.value ? neighbours(all.value, current.value.id) : { before: [], after: [] }));
// Pages with an art wall (a gallery, an archived season) put these at the wall's two ends instead
// (see WallEnd); every other room's page has them at the bottom.
provide("around", around);
const onWall = computed(() => /^\/galleries\/[^/]+$|^\/archive\/[^/]+\/[^/]+$/.test(route.path));

// The map: an overlay over the page you're on, opened from its mini map, with the room you're in
// pinned "you are here". It's the browser's own modal dialog, so Esc closes it, focus stays inside
// while it's open, and goes back to the mini map after. Going anywhere closes it.
const dialog = ref<HTMLDialogElement>();
const mapOpen = ref(false);
const closeMap = () => (mapOpen.value = false);
watch(mapOpen, (open) => {
  if (open && !dialog.value?.open) dialog.value?.showModal?.();
  if (!open && dialog.value?.open) dialog.value.close();
});
watch(() => route.fullPath, closeMap);
/** A click on the dimmed page around the map (the dialog itself, outside its content) closes it. */
const clickOutside = (e: MouseEvent) => e.target === dialog.value && closeMap();
</script>

<template>
  <RouterView v-if="atEntrance" />
  <template v-else>
    <header class="topbar">
      <RouterLink to="/" class="brand" aria-label="the moment: back to the entrance">The Moment</RouterLink>
    </header>
    <main :class="['page', { 'in-room': current }]">
      <!-- Focusable as a whole, so the keyboard can open the map too (the mouse clicks its floor). -->
      <div
        v-if="current"
        :key="current.id"
        class="minimap"
        role="button"
        tabindex="0"
        aria-haspopup="dialog"
        :aria-label="`you are in ${current.label}. open the map`"
        @keydown.enter.self.prevent="mapOpen = true"
        @keydown.space.self.prevent="mapOpen = true"
      >
        <FloorPlan :rooms="all" :here="current.id" mini @expand="mapOpen = true" />
        <span class="minimap-label" aria-hidden="true">Map</span>
      </div>
      <RouterView :key="route.fullPath" />
      <nav v-if="current && !onWall" class="neighbours" aria-label="rooms before and after">
        <span class="before">
          <RouterLink v-for="r in around.before" :key="r.id" :to="r.to">← {{ r.label }}</RouterLink>
        </span>
        <span class="after">
          <RouterLink v-for="r in around.after" :key="r.id" :to="r.to">{{ r.label }} →</RouterLink>
        </span>
      </nav>
    </main>

    <dialog ref="dialog" class="map-overlay" aria-label="map" @close="closeMap" @click="clickOutside">
      <div class="map-panel">
        <header class="map-head">
          <h1>Map</h1>
          <p>drag to look around and scroll or pinch to zoom. click a room to drop yourself in.</p>
          <button type="button" class="map-close" aria-label="close the map" @click="closeMap">×</button>
        </header>
        <FloorPlan v-if="mapOpen && all.length" :rooms="all" :here="current?.id" @enter="closeMap" />
      </div>
    </dialog>
  </template>

  <!-- Light or dark, from every page's bottom-left corner. -->
  <button
    type="button"
    class="theme-switch"
    :aria-label="theme === 'dark' ? 'switch to light mode' : 'switch to dark mode'"
    :aria-pressed="theme === 'dark'"
    @click="toggleTheme"
  >
    <!-- a moon in light mode (to go dark), a sun in dark mode (to go light) -->
    <svg v-if="theme === 'light'" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>
    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  </button>
</template>

<style scoped>
/* The top bar: just the name, in the title font, as the way back to the entrance. */
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 0.7em var(--gutter);
}
.brand {
  font-family: var(--title-font);
  font-size: 1.4rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-decoration: none;
}
/* Narrower than 1450px, the name turns on its side (reading upward) and sits in the left margin,
   clear of the page; at 1200px and under there's no margin for it, so it's left out. */
@media (max-width: 1449.98px) {
  .topbar {
    position: fixed;
    top: var(--gutter);
    left: 0;
    padding: 0 var(--gutter);
  }
  .brand {
    display: block;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }
}
@media (max-width: 1200px) {
  .topbar {
    display: none;
  }
}

.page {
  max-width: 1100px;
  margin: 0 auto;
  padding-inline: var(--gutter);
  padding-block: 2rem 4rem;
}

/* Every room's page: a mini map in the top corner, the page flowing around it. */
.minimap {
  float: right;
  position: relative; /* above positioned page content flowing beside it */
  z-index: 1;
  display: block;
  width: 230px;
  height: 200px;
  margin: 0 0 1rem 1.5rem;
  border: var(--line);
  background: var(--paper);
}
/* MAP, a label just inside the mini map's corner; clicks pass through it to the map. */
.minimap-label {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 0.1em 0.45em;
  background: var(--paper);
  font-family: var(--title-font);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  pointer-events: none;
}
.in-room :deep(h2),
.in-room :deep(.walk),
.in-room .neighbours {
  clear: right;
}

/* The map overlay: nearly the whole screen, the page dimmed around it. */
.map-overlay {
  width: min(1100px, calc(100vw - 2 * var(--gutter)));
  max-width: none;
  height: calc(100dvh - 4 * var(--gutter));
  max-height: none;
  padding: 0;
  border: var(--line);
  background: var(--paper);
  color: var(--ink);
}
.map-overlay::backdrop {
  background: var(--veil);
}
.map-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--gutter);
  gap: 0.6rem;
}
/* The title, the hint beside it, and × at the far end, all on one centred line. */
.map-head {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding: 0.2rem 0.2rem 0.4rem;
}
.map-head h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 1;
}
.map-head p {
  margin: 0;
  max-width: none;
  flex: 1;
}
.map-close {
  margin: 0;
}
/* The floor plan fills the rest of the panel. */
.map-panel :deep(.plan-frame) {
  flex: 1;
  min-height: 0;
}
.map-panel :deep(.plan) {
  height: 100%;
}

/* The light/dark switch, pinned to the bottom-left corner of every page. */
.theme-switch {
  position: fixed;
  left: var(--gutter);
  bottom: var(--gutter);
  z-index: 20;
  margin: 0;
  padding: 0.35rem;
  line-height: 0;
  background: var(--paper);
}
.theme-switch svg {
  width: 1.1rem;
  height: 1.1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.theme-switch:hover:not(:disabled) {
  background: var(--paper);
  color: var(--accent);
  border-color: var(--accent);
}

.neighbours {
  display: flex;
  justify-content: space-between;
  gap: 1em;
  margin-top: 1.4rem;
}
.neighbours .after {
  text-align: right;
  margin-left: auto;
}
.neighbours a {
  text-decoration: none;
}

@media (max-width: 720px) {
  .map-overlay {
    width: 100vw;
    height: 100dvh;
    border: 0;
  }
  .minimap {
    float: none;
    width: auto;
    margin: 0 0 1rem;
    height: 160px;
  }
  .neighbours {
    flex-direction: column;
  }
  .neighbours .after {
    text-align: left;
    margin-left: 0;
  }
}
</style>
