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
