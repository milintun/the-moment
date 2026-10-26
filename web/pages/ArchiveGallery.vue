<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import ErrorNote from "../components/ErrorNote.vue";
import { client, finishedSeasons } from "../api.ts";
import { explain } from "../errors.ts";

const group = useRoute().params.group as string;
const name = ref("");
const seasons = ref<ReturnType<typeof finishedSeasons>>([]);
const error = ref("");
const loaded = ref(false);

onMounted(async () => {
  const result = await client.groups.list({});
  if ("error" in result) return void (error.value = explain("/groups/list", result.error));
  const found = result.list.groups.find((g) => g.group === group);
  name.value = found?.name ?? "unknown gallery";
  seasons.value = found ? finishedSeasons(found) : [];
  loaded.value = true;
});
</script>

<template>
  <h1>{{ name }}</h1>
  <p class="lede">finished seasons of this room.</p>
  <p v-if="error"><ErrorNote :problem="error" /></p>
  <p v-if="loaded && !seasons.length && !error">no finished seasons yet.</p>
  <ol class="rooms">
    <li v-for="s in seasons" :key="s.season" class="room">
      <RouterLink class="room-name" :to="`/archive/${group}/${s.season}`">
        season {{ s.season + 1 }}
        <span class="kind">{{ s.start.toLocaleDateString() }} to {{ s.end.toLocaleDateString() }}</span>
      </RouterLink>
    </li>
  </ol>
  <p><RouterLink to="/archive">← the archive</RouterLink></p>
</template>
