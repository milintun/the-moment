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

onMounted(async () => {
  const [list, archive] = await Promise.all([client.groups.list({}), client.groups.archive({ group, season })]);
  const found = "error" in list ? undefined : list.list.groups.find((g) => g.group === group);
  const dates = found ? finishedSeasons(found).find((s) => s.season === season) : undefined;
  title.value = `${found?.name ?? "Unknown gallery"}, season ${season + 1}`;
  if (dates) title.value += ` (${dates.start.toLocaleDateString()} to ${dates.end.toLocaleDateString()})`;
  if ("error" in archive) error.value = archive.error === "NOT_FOUND" ? "This season isn't in the archive." : archive.error;
  else posts.value = archive.archive.posts;
});
</script>

<template>
  <h1>{{ title }}</h1>
  <p v-if="error">{{ error }}</p>
  <p v-else-if="!posts.length">No posts this season.</p>
  <div v-for="p in posts" :key="p.post">
    <hr />
    <p><img :src="`/api/images/${p.content}`" :alt="p.caption || `Post by ${p.owner}`" width="300" /></p>
    <p v-if="p.caption">{{ p.caption }}</p>
    <p>by {{ p.owner }} | {{ p.votes }} vote(s)</p>
  </div>
  <p><RouterLink to="/archive">Back to the archive</RouterLink></p>
</template>
