<script setup lang="ts">
import { onMounted, ref } from "vue";
import { client, me } from "../api.ts";

type Post = Extract<Awaited<ReturnType<typeof client.posts.mine>>, { mine: unknown }>["mine"]["posts"][number];

const posts = ref<Post[]>([]);
const confirming = ref<string | null>(null); // the post waiting for "Yes, delete"
const loaded = ref(false);
const error = ref("");

async function load() {
  const result = await client.posts.mine({});
  if ("error" in result) error.value = result.error;
  else posts.value = result.mine.posts;
  loaded.value = true;
}

async function remove(post: string) {
  confirming.value = null;
  const result = await client.posts.delete({ post });
  if ("error" in result) error.value = result.error;
  else posts.value = posts.value.filter((p) => p.post !== post);
}

onMounted(load);
</script>

<template>
  <h1>My posts</h1>
  <p v-if="!me"><RouterLink to="/login">Log in</RouterLink> to see your posts.</p>
  <template v-else>
    <p v-if="error">Error: {{ error }}</p>
    <p v-if="loaded && !posts.length && !error">You haven't posted anything yet.</p>
    <div v-for="p in posts" :key="p.post">
      <hr />
      <p><img :src="`/api/images/${p.content}`" :alt="p.caption || 'Your post'" width="300" /></p>
      <p v-if="p.caption">{{ p.caption }}</p>
      <p>
        Posted {{ new Date(p.createdAt).toLocaleString() }}
        <template v-if="p.current"> (current)</template>
      </p>
      <p>
        <template v-if="p.galleries.length">
          <template v-for="(g, i) in p.galleries" :key="g.group">
            <template v-if="i">, </template>
            <RouterLink :to="`/groups/${g.group}`">{{ g.name }}</RouterLink><template v-if="g.season != null">, season {{ g.season + 1 }}</template>
          </template>
        </template>
        <template v-else>No longer in a gallery</template>
        | {{ p.votes }} vote(s)
      </p>
      <p>
        <button v-if="confirming !== p.post" @click="confirming = p.post">Delete</button>
        <template v-else>
          Delete this post?
          <button @click="remove(p.post)">Yes, delete</button>
          <button @click="confirming = null">No</button>
        </template>
      </p>
    </div>
  </template>
</template>
