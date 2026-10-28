<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { me } from "./api.ts";
import FloorPlan from "./components/FloorPlan.vue";
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
</script>

<template>
  <RouterView v-if="atEntrance" />
  <template v-else>
    <header class="topbar">
      <RouterLink to="/map" class="brand">the moment · map</RouterLink>
      <RouterLink :to="me ? '/home' : '/auth'">{{ me ? `home (${me})` : "register / log in" }}</RouterLink>
    </header>
    <main :class="['page', { 'in-room': current }]">
      <RouterLink v-if="current" :key="current.id" class="minimap" :to="`/map?at=${current.id}`" :aria-label="`you are in ${current.label}. open the map`">
        <FloorPlan :rooms="all" :here="current.id" mini />
      </RouterLink>
      <RouterView :key="route.fullPath" />
      <nav v-if="current" class="neighbours" aria-label="rooms before and after">
        <span class="before">
          <RouterLink v-for="r in around.before" :key="r.id" :to="r.to">← {{ r.label }}</RouterLink>
        </span>
        <span class="after">
          <RouterLink v-for="r in around.after" :key="r.id" :to="r.to">{{ r.label }} →</RouterLink>
        </span>
      </nav>
    </main>
  </template>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  gap: 1em;
  padding: 0.7em var(--gutter);
  border-bottom: var(--line);
  background: var(--paper);
}
.brand {
  text-decoration: none;
  font-weight: 700;
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
  text-decoration: none;
}
.in-room :deep(h2),
.in-room :deep(.walk),
.in-room .neighbours {
  clear: right;
}.neighbours {
  display: flex;
  justify-content: space-between;
  gap: 1em;
  margin-top: 1.4rem;
}
.neighbours .after {
  text-align: right;
  margin-left: auto;
}

@media (max-width: 720px) {
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
