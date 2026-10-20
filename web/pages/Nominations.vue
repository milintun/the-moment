<script setup lang="ts">
import { onMounted, ref } from "vue";
import { client } from "../api.ts";

type Category = Extract<Awaited<ReturnType<typeof client.nominations.categories>>, { list: unknown }>["list"]["categories"][number];

const categories = ref<Category[]>([]);
const error = ref("");

onMounted(async () => {
  const result = await client.nominations.categories({});
  if ("error" in result) error.value = result.error;
  else categories.value = result.list.categories;
});
</script>

<template>
  <h1>Nominate</h1>
  <p>Name ideas for future galleries. Each round lasts one season; the most upvoted ideas help decide the next galleries.</p>
  <p v-if="error">Error: {{ error }}</p>
  <ul>
    <li v-for="c in categories" :key="c.category">
      <RouterLink :to="`/nominations/${c.category}`">{{ c.name }}</RouterLink>
      ({{ c.run == null ? "closed" : `round open until ${new Date(c.runEnd!).toLocaleString()}` }})
    </li>
  </ul>
  <p v-if="!categories.length && !error">No categories yet.</p>
</template>
