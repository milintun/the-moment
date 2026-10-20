<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { client, finishedSeasons } from "../api.ts";

type Post = Extract<Awaited<ReturnType<typeof client.groups.archive>>, { archive: unknown }>["archive"]["posts"][number];

const route = useRoute();
const group = route.params.group as string;
const season = Number(route.params.season);
const title = ref("");
const posts = ref<Post[]>([]);
const error = ref("");
const loaded = ref(false);

onMounted(async () => {
  const [list, archive] = await Promise.all([client.groups.list({}), client.groups.archive({ group, season })]);
  const found = "error" in list ? undefined : list.list.groups.find((g) => g.group === group);
  const dates = found ? finishedSeasons(found).find((s) => s.season === season) : undefined;
  title.value = `${found?.name ?? "unknown gallery"}, season ${season + 1}`;
  if (dates) title.value += ` (${dates.start.toLocaleDateString()} to ${dates.end.toLocaleDateString()})`;
  if ("error" in archive) error.value = archive.error === "NOT_FOUND" ? "this season isn't in the archive." : archive.error;
  else posts.value = archive.archive.posts;
  loaded.value = true;
});
</script>

<template>
  <h1>{{ title }}</h1>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-else-if="loaded && !posts.length">no art was hung this season.</p>
  <div class="walk">
    <figure v-for="p in posts" :key="p.post" class="artwork">
      <img :src="`/api/images/${p.content}`" :alt="p.caption || `post by ${p.owner}`" />
      <figcaption>
        <p v-if="p.caption">{{ p.caption }}</p>
        <p class="meta">by {{ p.owner }} · {{ p.votes }} vote(s)</p>
      </figcaption>
    </figure>
  </div>
  <p><RouterLink :to="`/archive/${group}`">← all seasons</RouterLink></p>
</template>
