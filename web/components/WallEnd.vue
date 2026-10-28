<script setup lang="ts">
import { inject, type Ref } from "vue";
import type { Room } from "../museum.ts";

// One end of an art wall: the room before it (at the start) or after it (at the end), so the
// walk along the wall carries on into the next room. The rooms come from the page's layout.
defineProps<{ side: "before" | "after" }>();
const around = inject<Ref<{ before: Room[]; after: Room[] }>>("around");
</script>

<template>
  <RouterLink
    v-for="r in around?.[side] ?? []"
    :key="r.id"
    :to="r.to"
    :class="['wall-end', side]"
    :aria-label="`${side === 'before' ? 'previous' : 'next'} room: ${r.label}`"
  >
    <span>{{ r.label }}</span>
    <span class="arrow" aria-hidden="true">{{ side === "before" ? "←" : "→" }}</span>
  </RouterLink>
</template>

<style scoped>
.wall-end {
  flex: 0 0 auto;
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2em;
  padding: 0 1rem;
  text-decoration: none;
  scroll-snap-align: start; /* the wall can rest at its very ends, not only on artworks */
}
.wall-end.after {
  scroll-snap-align: end;
}
.arrow {
  font-size: 2.2rem;
  line-height: 1;
}
</style>
