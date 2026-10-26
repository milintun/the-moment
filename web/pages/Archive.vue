<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ErrorNote from "../components/ErrorNote.vue";
import { WING_MIN_PERIOD, client, finishedSeasons } from "../api.ts";
import { explain } from "../errors.ts";

type Group = Extract<Awaited<ReturnType<typeof client.archive.galleries>>, { page: unknown }>["page"]["groups"][number];

// Galleries come a page at a time from Grouping (the server pages them), so the archive
// stays quick however many galleries pile up.
const PAGE = 20;
const groups = ref<Group[]>([]);
const more = ref(true); // a full page came back, so there may be another
const error = ref("");
const loaded = ref(false);

async function loadMore() {
  const result = await client.archive.galleries({ offset: groups.value.length, limit: PAGE });
  if ("error" in result) error.value = explain("/archive/galleries", result.error);
  else {
    groups.value.push(...result.page.groups);
    more.value = result.page.groups.length === PAGE;
  }
}

onMounted(async () => {
  await loadMore();
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
  <p v-if="error"><ErrorNote :problem="error" /></p>
  <p v-if="loaded && !rooms.length && !more && !error">nothing has been archived yet.</p>
  <ol class="rooms">
    <li v-for="g in rooms" :key="g.group" class="room">
      <RouterLink class="room-name" :to="`/archive/${g.group}`">
        {{ g.name }} <span class="kind">{{ g.wing ? "wing" : "gallery" }} · {{ g.seasons }} season(s)</span>
      </RouterLink>
    </li>
  </ol>
  <p v-if="loaded && more && !error"><button @click="loadMore">load more galleries</button></p>
</template>
