<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { WING_MIN_PERIOD, client, finishedSeasons } from "../api.ts";

type Group = Extract<Awaited<ReturnType<typeof client.groups.list>>, { list: unknown }>["list"]["groups"][number];

const groups = ref<Group[]>([]);
const error = ref("");
const loaded = ref(false);

onMounted(async () => {
  const result = await client.groups.list({});
  if ("error" in result) error.value = result.error;
  else groups.value = result.list.groups;
  loaded.value = true;
});

// One room per gallery or wing that has at least one finished season.
const rooms = computed(() =>
  groups.value
    .map((g) => ({ ...g, seasons: finishedSeasons(g).length, wing: g.period != null && g.period >= WING_MIN_PERIOD }))
    .filter((g) => g.seasons),
);
</script>

<template>
  <h1>Archive</h1>
  <p class="lede">every gallery's past seasons, as they ended. archived art can be viewed but not voted on.</p>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="loaded && !rooms.length && !error">nothing has been archived yet.</p>
  <ol class="rooms">
    <li v-for="g in rooms" :key="g.group" class="room">
      <RouterLink class="room-name" :to="`/archive/${g.group}`">
        {{ g.name }} <span class="kind">{{ g.wing ? "wing" : "gallery" }} · {{ g.seasons }} season(s)</span>
      </RouterLink>
    </li>
  </ol>
</template>
