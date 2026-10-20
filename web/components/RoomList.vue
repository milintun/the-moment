<script setup lang="ts">
import type { Room } from "../museum.ts";

// The stand-in map: rooms in walking order; clicking a room enters it. Compact mode is the
// small "you are here" version.
defineProps<{ rooms: Room[]; current?: string; compact?: boolean }>();
</script>

<template>
  <ol :class="['rooms', { compact }]">
    <li v-for="r in rooms" :key="r.id" :class="['room', `kind-${r.kind}`, { here: r.id === current }]">
      <RouterLink class="room-name" :to="r.to">
        {{ r.label }}
        <span v-if="!compact && (r.kind === 'wing' || r.kind === 'gallery')" class="kind">{{ r.kind }}</span>
        <template v-if="r.id === current"> (you are here)</template>
      </RouterLink>
    </li>
  </ol>
</template>
