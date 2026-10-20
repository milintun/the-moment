<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { client, me } from "../api.ts";

type Post = Extract<Awaited<ReturnType<typeof client.groups.feed>>, { feed: unknown }>["feed"]["posts"][number];

const route = useRoute();
const group = route.params.id as string;
const name = ref("");
const open = ref(false);
const posts = ref<Post[]>([]);
const voted = ref(new Set<string>());
const confirming = ref<string | null>(null); // the post waiting for "Yes, delete"
const error = ref("");

// After posting, the page opens at #post-<id>: scroll that post into view.
const target = route.hash.slice(1);
const scrollToTarget = () => document.getElementById(target)?.scrollIntoView();

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

async function remove(post: string) {
  confirming.value = null;
  const result = await client.posts.delete({ post });
  if ("error" in result) error.value = result.error;
  else posts.value = posts.value.filter((p) => p.post !== post);
}

onMounted(async () => {
  await load();
  if (target) {
    await nextTick();
    scrollToTarget();
  }
});
</script>

<template>
  <h1>{{ name }}</h1>
  <p>{{ open ? "Open" : "Closed" }}</p>
  <p v-if="me && open"><RouterLink :to="`/groups/${group}/post`">Post here</RouterLink></p>
  <p v-if="error">Error: {{ error }}</p>
  <p v-if="!posts.length">No posts this season.</p>
  <div v-for="p in posts" :id="`post-${p.post}`" :key="p.post">
    <hr />
    <!-- Images load after the first scroll and push content down, so scroll again once the target's loads. -->
    <p>
      <img
        :src="`/api/images/${p.content}`"
        :alt="p.caption || `Post by ${p.owner}`"
        width="300"
        @load="target === `post-${p.post}` && scrollToTarget()"
      />
    </p>
    <p v-if="p.caption">{{ p.caption }}</p>
    <p>
      by {{ p.owner }} | {{ p.votes }} vote(s)
      <button v-if="me && me !== p.owner" @click="toggle(p.post)">
        {{ voted.has(p.post) ? "Unvote" : "Upvote" }}
      </button>
      <template v-if="me === p.owner">
        <button v-if="confirming !== p.post" @click="confirming = p.post">Delete</button>
        <template v-else>
          Delete this post?
          <button @click="remove(p.post)">Yes, delete</button>
          <button @click="confirming = null">No</button>
        </template>
      </template>
    </p>
  </div>
</template>
