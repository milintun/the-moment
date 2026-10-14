<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { client, WING_MIN_PERIOD } from "../api.ts";

type Group = Extract<Awaited<ReturnType<typeof client.groups.list>>, { list: unknown }>["list"]["groups"][number];

const groups = ref<Group[]>([]);
const error = ref("");

onMounted(async () => {
  const result = await client.groups.list({});
  if ("error" in result) error.value = result.error;
  else groups.value = result.list.groups;
});

// Groups with no cycle are hidden; the rest split by cycle length.
const cycling = computed(() => groups.value.filter((g) => g.period != null));
const wings = computed(() => cycling.value.filter((g) => g.period! >= WING_MIN_PERIOD));
const galleries = computed(() => cycling.value.filter((g) => g.period! < WING_MIN_PERIOD));

function status(g: Group) {
  return g.run == null ? "closed" : `season ${g.run + 1} of ${g.runs}, ends ${new Date(g.runEnd!).toLocaleString()}`;
}
</script>

<template>
  <h1>Browse</h1>
  <p v-if="error">Error: {{ error }}</p>
  <h2>Wings</h2>
  <ul>
    <li v-for="g in wings" :key="g.group">
      <RouterLink :to="`/groups/${g.group}`">{{ g.name }}</RouterLink> ({{ status(g) }})
    </li>
  </ul>
  <p v-if="!wings.length">None.</p>
  <h2>Galleries</h2>
  <ul>
    <li v-for="g in galleries" :key="g.group">
      <RouterLink :to="`/groups/${g.group}`">{{ g.name }}</RouterLink> ({{ status(g) }})
    </li>
  </ul>
  <p v-if="!galleries.length">None.</p>
</template>
