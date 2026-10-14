<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { client, me } from "../api.ts";

type Post = Extract<Awaited<ReturnType<typeof client.groups.feed>>, { feed: unknown }>["feed"]["posts"][number];

const group = useRoute().params.id as string;
const name = ref("");
const open = ref(false);
const posts = ref<Post[]>([]);
const voted = ref(new Set<string>());
const error = ref("");

async function load() {
  const [list, feed] = await Promise.all([client.groups.list({}), client.groups.feed({ group })]);
  if ("error" in list || "error" in feed) {
    error.value = "error" in list ? list.error : (feed as { error: string }).error;
    return;
  }
  const found = list.list.groups.find((g) => g.group === group);
  name.value = found?.name ?? "Unknown group";
  open.value = found?.run != null;
  posts.value = feed.feed.posts;
  if (me.value) {
    const mine = await client.posts["my-votes"]({ group });
    voted.value = new Set("error" in mine ? [] : mine.votes.posts.map((p) => p.post));
  }
}

async function toggle(post: string) {
  const result = voted.value.has(post) ? await client.posts.unvote({ post }) : await client.posts.vote({ post });
  error.value = "error" in result ? result.error : "";
  await load();
}

onMounted(load);
</script>

<template>
  <h1>{{ name }}</h1>
  <p>{{ open ? "Open" : "Closed" }}</p>
  <p v-if="me && open"><RouterLink :to="`/groups/${group}/post`">Post here</RouterLink></p>
  <p v-if="error">Error: {{ error }}</p>
  <p v-if="!posts.length">No posts this season.</p>
  <div v-for="p in posts" :key="p.post">
    <hr />
    <p><img :src="p.content" :alt="`Post by ${p.owner}`" width="300" /></p>
    <p>
      by {{ p.owner }} | {{ p.votes }} vote(s)
      <button v-if="me && me !== p.owner" @click="toggle(p.post)">
        {{ voted.has(p.post) ? "Unvote" : "Upvote" }}
      </button>
    </p>
  </div>
</template>
