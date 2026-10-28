<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { client, wallOrder, type WallSort } from "../api.ts";
import { explain, type Problem } from "../errors.ts";
import ErrorNote from "./ErrorNote.vue";

type Post = Extract<Awaited<ReturnType<typeof client.posts.mine>>, { mine: unknown }>["mine"]["posts"][number];

const props = defineProps<{ order: WallSort }>();
const posts = ref<Post[]>([]);
const shown = computed(() => wallOrder(posts.value, props.order));
const confirming = ref<string | null>(null); // the post waiting for "yes, delete"
const loaded = ref(false);
const problem = ref<Problem | null>(null); // at "list", or at an item

onMounted(async () => {
  const result = await client.posts.mine({});
  if ("error" in result) problem.value = { at: "list", message: explain("/posts/mine", result.error) };
  else posts.value = result.mine.posts;
  loaded.value = true;
});

async function remove(post: string) {
  confirming.value = null;
  const result = await client.posts.delete({ post });
  // An item already gone leaves the list, so its message shows above the list instead.
  if ("error" in result) problem.value = { at: result.error === "NOT_FOUND" ? "list" : post, message: explain("/posts/delete", result.error) };
  // Done, or already gone: either way it's off the list.
  if (!("error" in result) || result.error === "NOT_FOUND") posts.value = posts.value.filter((p) => p.post !== post);
}
</script>

<template>
  <p v-if="problem?.at === 'list'"><ErrorNote :problem="problem" at="list" /></p>
  <p v-if="loaded && !posts.length && problem?.at !== 'list'">you haven't posted anything yet.</p>
  <ul class="cards">
    <li v-for="p in shown" :key="p.post" class="card">
      <img :src="`/api/images/${p.content}`" :alt="p.caption || 'your post'" />
      <p v-if="p.caption">{{ p.caption }}</p>
      <p class="meta">
        posted {{ new Date(p.createdAt).toLocaleString() }}<template v-if="p.current"> · <strong>current</strong></template>
      </p>
      <p class="meta">
        <template v-if="p.galleries.length">
          <template v-for="(g, i) in p.galleries" :key="g.group">
            <template v-if="i">, </template>
            <RouterLink :to="`/galleries/${g.group}`">{{ g.name }}</RouterLink><template v-if="g.season != null">, season {{ g.season + 1 }}</template>
          </template>
        </template>
        <template v-else>no longer in a gallery</template>
        · {{ p.votes }} vote(s)
      </p>
      <p>
        <button v-if="confirming !== p.post" @click="confirming = p.post">delete</button>
        <template v-else>
          delete this post?
          <button @click="remove(p.post)">yes, delete</button>
          <button @click="confirming = null">no</button>
        </template>
      </p>
      <ErrorNote :problem="problem" :at="p.post" />
    </li>
  </ul>
</template>

<style scoped>
.cards {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
}
.card {
  border: var(--line);
  padding: 0.8em;
  min-width: 0;
}
.card img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  margin-bottom: 0.6em;
}
</style>
