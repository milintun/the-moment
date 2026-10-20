<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import RoomList from "../components/RoomList.vue";
import { client, me } from "../api.ts";
import { neighbours, rooms, type Room } from "../museum.ts";

type Post = Extract<Awaited<ReturnType<typeof client.groups.feed>>, { feed: unknown }>["feed"]["posts"][number];

const route = useRoute();
const group = route.params.id as string;
const all = ref<Room[]>([]);
const name = ref("");
const season = ref("");
const open = ref(false);
const posts = ref<Post[]>([]);
const voted = ref(new Set<string>());
const confirming = ref<string | null>(null); // the post waiting for "yes, delete"
const error = ref("");
const loaded = ref(false); // render once the first load is done, so nothing flashes

const around = computed(() => neighbours(all.value, group));

// After posting, the page opens at #post-<id>: walk to that artwork.
const target = route.hash.slice(1);
const scrollToTarget = () => document.getElementById(target)?.scrollIntoView({ inline: "center", block: "nearest" });

async function load() {
  const [list, feed] = await Promise.all([client.groups.list({}), client.groups.feed({ group })]);
  if ("error" in list || "error" in feed) {
    error.value = "error" in list ? list.error : (feed as { error: string }).error;
    return;
  }
  const found = list.list.groups.find((g) => g.group === group);
  name.value = found?.name ?? "unknown gallery";
  open.value = found?.run != null;
  season.value = found?.run != null ? `season ${found.run + 1} of ${found.runs} · until ${new Date(found.runEnd!).toLocaleString()}` : "closed";
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
  [all.value] = await Promise.all([rooms(), load()]);
  loaded.value = true;
  if (target) {
    await nextTick();
    scrollToTarget();
  }
});
</script>

<template>
  <div v-if="loaded" class="view">
    <header class="view-head">
      <h1>{{ name }}</h1>
      <p class="meta">{{ season }}</p>
      <p v-if="open">
        <RouterLink class="button" :to="me ? `/galleries/${group}/post` : '/auth'">post here</RouterLink>
      </p>
    </header>

    <aside class="minimap" aria-label="where you are">
      <RoomList :rooms="all" :current="group" compact />
    </aside>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!posts.length && !error" class="empty">no art on these walls yet this season.</p>

    <div class="walk">
      <figure v-for="p in posts" :id="`post-${p.post}`" :key="p.post" class="artwork">
        <!-- Images load after the first scroll and shift the wall, so walk again once the target's loads. -->
        <img
          :src="`/api/images/${p.content}`"
          :alt="p.caption || `post by ${p.owner}`"
          @load="target === `post-${p.post}` && scrollToTarget()"
        />
        <figcaption>
          <p v-if="p.caption">{{ p.caption }}</p>
          <p class="meta">by {{ p.owner }} · {{ p.votes }} vote(s)</p>
          <p>
            <button v-if="me && me !== p.owner" :class="{ voted: voted.has(p.post) }" @click="toggle(p.post)">
              {{ voted.has(p.post) ? "unvote" : "upvote" }}
            </button>
            <template v-if="me === p.owner">
              <button v-if="confirming !== p.post" @click="confirming = p.post">delete</button>
              <template v-else>
                delete this post?
                <button @click="remove(p.post)">yes, delete</button>
                <button @click="confirming = null">no</button>
              </template>
            </template>
          </p>
        </figcaption>
      </figure>
    </div>

    <nav class="neighbours">
      <span class="before">
        <RouterLink v-for="r in around.before" :key="r.id" :to="r.to">← {{ r.label }}</RouterLink>
      </span>
      <span class="after">
        <RouterLink v-for="r in around.after" :key="r.id" :to="r.to">{{ r.label }} →</RouterLink>
      </span>
    </nav>
  </div>
</template>
