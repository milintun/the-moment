<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import ErrorNote from "../components/ErrorNote.vue";
import RoomList from "../components/RoomList.vue";
import { client, isAdmin, me, seasonPhase, span, useNow } from "../api.ts";
import { explain, type Problem } from "../errors.ts";
import { neighbours, rooms, type Room } from "../museum.ts";

type Post = Extract<Awaited<ReturnType<typeof client.groups.feed>>, { feed: unknown }>["feed"]["posts"][number];

const route = useRoute();
const group = route.params.id as string;
const all = ref<Room[]>([]);
const name = ref("");
// The running season, or null when the gallery is closed.
const season = ref<{ run: number; runs: number; runStart: string; runEnd: string } | null>(null);
const posts = ref<Post[]>([]);
const voted = ref(new Set<string>());
const confirming = ref<string | null>(null); // the post waiting for "yes, delete"
const confirmingRemoval = ref<string | null>(null); // the post an admin is about to remove
const problem = ref<Problem | null>(null); // at "page", or at a post's id
const loaded = ref(false); // render once the first load is done, so nothing flashes

const around = computed(() => neighbours(all.value, group));

const now = useNow();
const phase = computed(() => (season.value ? seasonPhase(season.value, now.value) : null));
const open = computed(() => phase.value != null && phase.value !== "ended");

// After posting, the page opens at #post-<id>: walk to that artwork.
const target = route.hash.slice(1);
const scrollToTarget = () => document.getElementById(target)?.scrollIntoView({ inline: "center", block: "nearest" });

async function load() {
  const [list, feed] = await Promise.all([client.groups.list({}), client.groups.feed({ group })]);
  if ("error" in list) return void (problem.value = { at: "page", message: explain("/groups/list", list.error) });
  if ("error" in feed) return void (problem.value = { at: "page", message: explain("/groups/feed", feed.error) });
  const found = list.list.groups.find((g) => g.group === group);
  name.value = found?.name ?? "unknown gallery";
  season.value =
    found?.run != null ? { run: found.run, runs: found.runs!, runStart: found.runStart!, runEnd: found.runEnd! } : null;
  posts.value = feed.feed.posts;
  if (me.value) {
    const mine = await client.posts["my-votes"]({ group });
    voted.value = new Set("error" in mine ? [] : mine.votes.posts.map((p) => p.post));
  }
}

const SEASON_OVER = "this season is over, so its votes are final.";

async function toggle(post: string) {
  problem.value = null;
  const unvoting = voted.value.has(post);
  const result = unvoting ? await client.posts.unvote({ post }) : await client.posts.vote({ post });
  // The season ended while the page was open: keep the wall as it was (the header points to the
  // archive) rather than reloading a closed gallery's empty feed.
  if (season.value && seasonPhase(season.value) === "ended") {
    if ("error" in result) problem.value = { at: post, message: SEASON_OVER };
    return;
  }
  await load();
  if (!("error" in result)) return;
  // NOT_FOUND on unvote is either "never voted" or "post gone"; the reloaded wall tells which.
  const gone = !posts.value.some((p) => p.post === post);
  problem.value = {
    at: gone ? "page" : post, // a post that's gone has no spot on the wall left to show it
    message: unvoting
      ? explain("/posts/unvote", result.error, { NOT_FOUND: gone ? "this post was taken down." : undefined })
      : explain("/posts/vote", result.error),
  };
}

async function remove(post: string) {
  confirming.value = null;
  const result = await client.posts.delete({ post });
  if ("error" in result) problem.value = { at: result.error === "NOT_FOUND" ? "page" : post, message: explain("/posts/delete", result.error) };
  // Deleted, or already gone: either way it's off the wall.
  if (!("error" in result) || result.error === "NOT_FOUND") posts.value = posts.value.filter((p) => p.post !== post);
}

// Admins can take a post off this gallery's wall; the post itself is kept (its owner still has it).
async function removeFromGallery(post: string) {
  confirmingRemoval.value = null;
  const result = await client.admin.groups["remove-post"]({ group, post });
  if ("error" in result) problem.value = { at: result.error === "NOT_FOUND" ? "page" : post, message: explain("/admin/groups/remove-post", result.error) };
  if (!("error" in result) || result.error === "NOT_FOUND") posts.value = posts.value.filter((p) => p.post !== post);
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
      <p v-if="!season" class="meta">closed</p>
      <template v-else>
        <p class="meta">
          season {{ season.run + 1 }} of {{ season.runs }}<template v-if="season.run === season.runs - 1"> · final season</template>
          <template v-if="phase !== 'ended'"> · until {{ new Date(season.runEnd).toLocaleString() }}</template>
        </p>
        <p v-if="phase === 'new'" class="season-notice">
          new season · started {{ span(now - new Date(season.runStart).getTime()) }} ago
        </p>
        <p v-else-if="phase === 'ending'" class="season-notice">
          ending soon · {{ span(new Date(season.runEnd).getTime() - now) }} left to post and vote
        </p>
        <p v-else-if="phase === 'ended'" class="season-notice">
          this season just ended. <RouterLink :to="`/archive/${group}/${season.run}`">see it in the archive</RouterLink>
        </p>
      </template>
      <p v-if="open">
        <RouterLink class="button" :to="me ? `/galleries/${group}/post` : '/auth'">post here</RouterLink>
      </p>
    </header>

    <aside class="minimap" aria-label="where you are">
      <RoomList :rooms="all" :current="group" compact />
    </aside>

    <p v-if="problem?.at === 'page'"><ErrorNote :problem="problem" at="page" /></p>
    <p v-if="loaded && !posts.length && problem?.at !== 'page'" class="empty">no art on these walls yet this season.</p>

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
            <template v-if="isAdmin && me !== p.owner">
              <button v-if="confirmingRemoval !== p.post" @click="confirmingRemoval = p.post">remove from gallery</button>
              <template v-else>
                remove this post from {{ name }}?
                <button @click="removeFromGallery(p.post)">yes, remove</button>
                <button @click="confirmingRemoval = null">no</button>
              </template>
            </template>
          </p>
          <p v-if="problem?.at === p.post"><ErrorNote :problem="problem" :at="p.post" /></p>
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
