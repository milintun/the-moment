<script setup lang="ts">
import type { Room } from "../museum.ts";

// The map as a plain list: rooms in walking order; clicking a room enters it.
defineProps<{ rooms: Room[] }>();
</script>

<template>
  <ol class="rooms">
    <li v-for="r in rooms" :key="r.id" :class="['room', `kind-${r.kind}`]">
      <RouterLink class="room-name" :to="r.to">
        {{ r.label }}
        <span v-if="r.kind === 'wing' || r.kind === 'gallery'" class="kind">{{ r.kind }}</span>
        <span v-if="r.notice" :class="['badge', { ending: r.notice === 'ending soon' }]">{{ r.notice }}</span>
      </RouterLink>
    </li>
  </ol>
</template>

<style scoped>
/* "new" and "ending soon" tags on rooms; ending soon is filled in so it stands out. */
.badge {
  display: inline-block;
  border: var(--line);
  padding: 0 0.4em;
  margin-left: 0.5em;
  font-size: 0.8em;
  font-weight: 400;
  line-height: 1.4;
}
.badge.ending {
  background: var(--ink);
  color: var(--paper);
}
.room.kind-wing > .room-name,
.room.kind-gallery > .room-name {
  font-weight: 700;
}
</style>
