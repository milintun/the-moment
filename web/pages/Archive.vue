<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import ErrorNote from "../components/ErrorNote.vue";
import { client, finishedSeasons, normalizeName } from "../api.ts";
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

// One room per gallery or wing that has at least one finished season, with the dates its
// archived seasons span (the first one's start to the last one's end) and those seasons.
const day = (d: Date) => d.toLocaleDateString();
const rooms = computed(() =>
  groups.value.flatMap((g) => {
    const seasons = finishedSeasons(g);
    if (!seasons.length) return [];
    return [{ ...g, seasons, span: `${day(seasons[0]!.start)} – ${day(seasons.at(-1)!.end)}` }];
  }),
);

// Searching narrows the list as you type, by name, ignoring case and spacing. It has to see
// every gallery, so the first search loads the pages not loaded yet.
// ponytail: loads the whole archive into the page; a server-side name search if it grows to thousands.
const query = ref("");
const searching = computed(() => normalizeName(query.value) !== "");
const shown = computed(() => rooms.value.filter((g) => normalizeName(g.name).includes(normalizeName(query.value))));
watch(searching, async (on) => {
  while (on && more.value && !error.value) await loadMore();
});
</script>

<template>
  <h1>Archive</h1>
  <p class="lede">past galleries</p>
  <p v-if="error"><ErrorNote :problem="error" /></p>
  <p v-if="loaded && !rooms.length && !more && !error">nothing has been archived yet.</p>
  <p v-else-if="loaded">
    <input v-model="query" type="search" class="search" placeholder="search galleries" aria-label="search the archive by name" />
  </p>
  <p v-if="searching && !shown.length && !more">no galleries match "{{ query.trim() }}".</p>
  <ol class="rooms">
    <!-- Clicking a gallery opens its seasons below it; each goes to that season's wall. -->
    <li v-for="g in shown" :key="g.group" class="room">
      <details>
        <summary class="room-name">{{ g.name }} ({{ g.span }})</summary>
        <ul class="seasons">
          <li v-for="s in g.seasons" :key="s.season">
            <RouterLink :to="`/archive/${g.group}/${s.season}`">season {{ s.season + 1 }}</RouterLink>
          </li>
        </ul>
      </details>
    </li>
  </ol>
  <p v-if="loaded && more && !error && !searching"><button @click="loadMore">load more galleries</button></p>
</template>

<style scoped>
.search {
  width: min(100%, 320px);
  margin: 1rem 0 0.5rem 0;
}
.room-name {
  cursor: pointer;
  list-style: none; /* no disclosure triangle */
}
.room-name::-webkit-details-marker {
  display: none;
}
.room-name:hover {
  color: var(--accent);
}
/* The seasons hang off their own short line, a tick to each, like the rooms off the corridor. */
.seasons {
  padding-top: 0.5rem;
  list-style: none;
  margin: 0.3em 0 0 0.2em;
  padding-left: 0;
  border-left: var(--line);
}
.seasons li {
  position: relative;
  padding: 0.15em 0 0.15em 1.2em;
}
.seasons li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.9em;
  width: 0.8em;
  border-top: var(--line);
}
.seasons a {
  text-decoration: none;
}
</style>
