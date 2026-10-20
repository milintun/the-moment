<script setup lang="ts">
import { onMounted, ref } from "vue";
import { client } from "../api.ts";

type Post = Extract<Awaited<ReturnType<typeof client.posts.mine>>, { mine: unknown }>["mine"]["posts"][number];

const posts = ref<Post[]>([]);
const confirming = ref<string | null>(null); // the post waiting for "yes, delete"
const loaded = ref(false);
const error = ref("");

onMounted(async () => {
  const result = await client.posts.mine({});
  if ("error" in result) error.value = result.error;
  else posts.value = result.mine.posts;
  loaded.value = true;
});

async function remove(post: string) {
  confirming.value = null;
  const result = await client.posts.delete({ post });
  if ("error" in result) error.value = result.error;
  else posts.value = posts.value.filter((p) => p.post !== post);
}
</script>

<template>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="loaded && !posts.length && !error">you haven't posted anything yet.</p>
  <ul class="cards">
    <li v-for="p in posts" :key="p.post" class="card">
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
    </li>
  </ul>
</template>
