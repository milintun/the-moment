<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { WING_MIN_PERIOD, client, finishedSeasons } from "../api.ts";

type Group = Extract<Awaited<ReturnType<typeof client.groups.list>>, { list: unknown }>["list"]["groups"][number];

const groups = ref<Group[]>([]);
const error = ref("");

onMounted(async () => {
  const result = await client.groups.list({});
  if ("error" in result) error.value = result.error;
  else groups.value = result.list.groups;
});

// Only groups with at least one finished season appear, wings first.
const withHistory = computed(() =>
  groups.value
    .map((g) => ({ ...g, seasons: finishedSeasons(g) }))
    .filter((g) => g.seasons.length),
);
const wings = computed(() => withHistory.value.filter((g) => g.period! >= WING_MIN_PERIOD));
const galleries = computed(() => withHistory.value.filter((g) => g.period! < WING_MIN_PERIOD));
const day = (date: Date) => date.toLocaleDateString();
</script>

<template>
  <h1>Archive</h1>
  <p>Past seasons, as they ended. Archived posts can be viewed but not voted on.</p>
  <p v-if="error">Error: {{ error }}</p>
  <template v-for="[title, list] in [['Wings', wings], ['Galleries', galleries]] as const" :key="title">
    <h2>{{ title }}</h2>
    <p v-if="!list.length">No finished seasons yet.</p>
    <div v-for="g in list" :key="g.group">
      <h3>{{ g.name }}</h3>
      <ul>
        <li v-for="s in g.seasons" :key="s.season">
          <RouterLink :to="`/archive/${g.group}/${s.season}`">Season {{ s.season + 1 }}</RouterLink>
          ({{ day(s.start) }} to {{ day(s.end) }})
        </li>
      </ul>
    </div>
  </template>
</template>
