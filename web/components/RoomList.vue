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
