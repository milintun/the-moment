<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { setTitle } from "../router.ts";
import ErrorNote from "../components/ErrorNote.vue";
import WallOrder from "../components/WallOrder.vue";
import { client, dayAndHour, finishedSeasons, wallOrder, type WallSort } from "../api.ts";
import { explain } from "../errors.ts";

type Post = Extract<Awaited<ReturnType<typeof client.groups.archive>>, { archive: unknown }>["archive"]["posts"][number];

const route = useRoute();
const group = route.params.group as string;
const season = Number(route.params.season);
const name = ref("");
const runs = ref<number | null>(null);
const dates = ref<{ start: Date; end: Date } | null>(null);
const posts = ref<Post[]>([]);
const order = ref<WallSort>("votes");
const wall = computed(() => wallOrder(posts.value, order.value));
// A new order starts the walk again from the wall's beginning.
const walk = ref<HTMLElement>();
watch(order, () => walk.value?.scrollTo?.({ left: 0 }));
const error = ref("");
const loaded = ref(false);

onMounted(async () => {
  const [list, archive] = await Promise.all([client.groups.list({}), client.groups.archive({ group, season })]);
  const found = "error" in list ? undefined : list.list.groups.find((g) => g.group === group);
  name.value = found?.name ?? "unknown gallery";
  setTitle(`${name.value}, season ${season + 1}`);
  runs.value = found?.runs ?? null;
  dates.value = (found && finishedSeasons(found).find((s) => s.season === season)) || null;
  if ("error" in archive) error.value = explain("/groups/archive", archive.error);
  else posts.value = archive.archive.posts;
  loaded.value = true;
});
</script>

<template>
  <h1>{{ name }}</h1>
  <p class="season-line">season {{ season + 1 }}<template v-if="runs"> of {{ runs }}</template></p>
  <p v-if="dates" class="season-dates">{{ dayAndHour(dates.start) }} to {{ dayAndHour(dates.end) }}</p>
  <p v-if="error"><ErrorNote :problem="error" /></p>
  <p class="sort-note"><WallOrder v-model="order" /></p>
  <div ref="walk" class="walk">
    <p v-if="loaded && !error && !posts.length" class="empty">no art was hung this season.</p>
    <figure v-for="p in wall" :key="p.post" class="artwork">
      <img :src="`/api/images/${p.content}`" :alt="p.caption || `post by ${p.owner}`" />
      <figcaption>
        <div class="credit">
          <div>
            <p v-if="p.caption">{{ p.caption }}</p>
            <p class="meta">by {{ p.owner }}</p>
          </div>
          <p class="meta votes">{{ p.votes }} {{ p.votes == 1 ? "vote" : "votes" }}</p>
        </div>
      </figcaption>
    </figure>
  </div>
  <p class="back"><RouterLink to="/archive">← back to archive</RouterLink></p>
</template>

<style scoped>
/* The name, then its season and dates close under it. */
h1 {
  margin-bottom: 0.3em;
}
.season-line,
.season-dates {
  margin: 0 0 0.15em;
}
/* Just above the wall, saying how it's ordered. */
.sort-note {
  clear: right; /* below the mini map, with the wall */
  margin: 0.5rem 0 0;
}
/* The way back, clear of the wall's bottom line. */
.back {
  margin-top: 2rem;
}
.back a {
  text-decoration: none;
}
/* On an empty wall, the message fills the middle, pushing the two ends out to the edges. */
.empty {
  flex: 1;
  align-self: center;
  margin: 0;
  max-width: none;
  padding: 2rem 0;
  text-align: center;
}
.sort-note + .walk {
  margin-top: 0.4rem;
}
</style>
