<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import ErrorNote from "../components/ErrorNote.vue";
import PostWindow from "../components/PostWindow.vue";
import WallEnd from "../components/WallEnd.vue";
import WallOrder from "../components/WallOrder.vue";
import { client, dayAndHour, isAdmin, me, seasonPhase, useNow, wallOrder, type WallSort } from "../api.ts";
import { explain, type Problem } from "../errors.ts";

type Post = Extract<Awaited<ReturnType<typeof client.groups.feed>>, { feed: unknown }>["feed"]["posts"][number];

const route = useRoute();
const group = route.params.id as string;
const name = ref("");
// The running season, or null when the gallery is closed.
const season = ref<{ run: number; runs: number; runStart: string; runEnd: string } | null>(null);
const posts = ref<Post[]>([]);
const order = ref<WallSort>("votes");
// By votes, the wall keeps the order it loaded in: a vote changes the count but doesn't move the
// art around under you (that would be jarring); the new order shows on the next visit.
const arrangement = ref<string[]>([]);
const wall = computed(() => {
  if (order.value !== "votes") return wallOrder(posts.value, order.value);
  const byId = new Map(posts.value.map((p) => [p.post, p]));
  return arrangement.value.flatMap((id) => byId.get(id) ?? []);
});
// A new order starts the walk again from the wall's beginning.
const walk = ref<HTMLElement>();
watch(order, () => walk.value?.scrollTo?.({ left: 0 }));
const voted = ref(new Set<string>());
const confirming = ref<string | null>(null); // the post waiting for "yes, delete"
const confirmingRemoval = ref<string | null>(null); // the post an admin is about to remove
const problem = ref<Problem | null>(null); // at "page", or at a post's id
const loaded = ref(false); // render once the first load is done, so nothing flashes

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
  const ids = posts.value.map((p) => p.post);
  const kept = arrangement.value.filter((id) => ids.includes(id));
  arrangement.value = [...kept, ...ids.filter((id) => !kept.includes(id))]; // newcomers at the end
  if (me.value) {
    const mine = await client.posts["my-votes"]({ group });
    voted.value = new Set("error" in mine ? [] : mine.votes.posts.map((p) => p.post));
  }
}

// Once posted (from POST + in the wall's corner), the wall reloads and walks to the new post.
async function posted(post: string) {
  await load();
  await nextTick();
  document.getElementById(`post-${post}`)?.scrollIntoView({ inline: "center", block: "nearest" });
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
  await load();
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
      <h1>
        {{ name }}
        <span v-if="phase === 'new' || phase === 'ending'" :class="['badge', { ending: phase === 'ending' }]">
          {{ phase === "new" ? "new" : "ending soon" }}
        </span>
      </h1>
      <p v-if="!season">closed</p>
      <template v-else>
        <p class="season-line">
          season {{ season.run + 1 }} of {{ season.runs }}<template v-if="season.run === season.runs - 1"> · final season</template>
        </p>
        <p class="season-dates">
          {{ dayAndHour(season.runStart) }} to {{ dayAndHour(season.runEnd) }}
        </p>
        <p v-if="phase === 'ended'" class="season-notice">
          this season just ended. <RouterLink :to="`/archive/${group}/${season.run}`">see it in the archive</RouterLink>
        </p>
      </template>
      <p v-if="open && !me" class="post-line">
        <RouterLink to="/auth">log in to post and vote</RouterLink>
      </p>
    </header>

    <p v-if="problem?.at === 'page'"><ErrorNote :problem="problem" at="page" /></p>

    <p class="sort-note"><WallOrder v-model="order" /></p>
    <div :class="['wall', { 'can-post': open && me }]">
      <div v-if="open && me" class="post-corner"><PostWindow :group="group" :title="`post to ${name}`" @posted="posted" /></div>
      <div ref="walk" class="walk">
        <WallEnd side="before" />
        <p v-if="loaded && !posts.length && problem?.at !== 'page'" class="empty">no art on the walls yet this season.</p>
        <figure v-for="p in wall" :id="`post-${p.post}`" :key="p.post" class="artwork">
          <!-- Signed in, someone else's art is itself the vote: click it to upvote, again to take it back.
               Images load after the first scroll and shift the wall, so walk again once the target's loads. -->
          <component
            :is="me && me !== p.owner ? 'button' : 'div'"
            v-bind="
              me && me !== p.owner
                ? {
                    type: 'button',
                    class: ['art-button', { voted: voted.has(p.post) }],
                    'data-action': voted.has(p.post) ? 'unvote' : 'upvote',
                    'aria-pressed': voted.has(p.post),
                    'aria-label': `${voted.has(p.post) ? 'take back your vote for' : 'upvote'} ${p.caption || `the post by ${p.owner}`}`,
                    onClick: () => toggle(p.post),
                  }
                : {}
            "
          >
            <img :src="`/api/images/${p.content}`" :alt="p.caption || `post by ${p.owner}`" @load="target === `post-${p.post}` && scrollToTarget()" />
          </component>
          <figcaption>
            <div class="credit">
              <div>
                <p v-if="p.caption">{{ p.caption }}</p>
                <p class="meta">by {{ p.owner }}</p>
              </div>
              <p :class="['meta', 'votes', { mine: voted.has(p.post) }]">{{ p.votes }} {{ p.votes == 1 ? "vote" : "votes" }}</p>
            </div>
            <p v-if="me === p.owner || isAdmin">
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
        <WallEnd side="after" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The name, then its season and dates close under it, then (lower) the way to post. */
.view-head h1 {
  margin-bottom: 0.3em;
}
.season-line,
.season-dates {
  margin: 0 0 0.15em;
}
.post-line {
  margin-top: 2.8em; /* low, near the wall: "sorted by" can't rise past the mini map's bottom */
  margin-bottom: 0;
}
/* Just above the wall, saying how it's ordered. */
/* Just above the wall, saying how it's ordered. */
.sort-note {
  clear: right; /* below the mini map, with the wall */
  margin: 0.5rem 0 0;
}
.sort-note + .wall .walk {
  margin-top: 0.5rem;
}
/* The wall, with POST + in its top left corner, inside the border. */
.wall {
  position: relative;
}
.wall .post-corner {
  position: absolute;
  top: calc(1px + 0.6rem);
  left: 0;
  z-index: 2;
}
.wall.can-post .walk {
  padding-top: 3.6rem; /* room for POST + above the art */
}
/* Someone else's art, signed in: click it to vote. Pointing at it washes it in the accent colour
   with what a click does ("upvote" or "unvote") in the middle; your vote shows as its count in
   the accent colour. */
.art-button {
  display: block;
  position: relative;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.art-button:hover:not(:disabled) {
  background: none;
}
.art-button:focus-visible {
  outline: none; /* the wash shows the focus */
}
.art-button::after {
  content: attr(data-action);
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent) 45%, transparent);
  color: var(--paper);
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0;
  transition: opacity 0.15s;
}
.art-button:hover::after,
.art-button:focus-visible::after {
  opacity: 1;
}
.votes.mine {
  color: var(--accent);
}
@media (prefers-reduced-motion: reduce) {
  .art-button::after {
    transition: none;
  }
}
/* "new" or "ending soon", beside the gallery's name; ending soon is filled in so it stands out. */
.badge {
  display: inline-block;
  vertical-align: middle;
  margin-left: 0.6rem;
  padding: 0 0.4em;
  border: var(--line);
  font-family: var(--font);
  font-size: 0.8rem;
  font-weight: 400;
  letter-spacing: normal;
  text-transform: lowercase;
  line-height: 1.5;
}
.badge.ending {
  background: var(--ink);
  color: var(--paper);
}
/* On an empty wall, the message fills the middle, pushing the two ends out to the edges. */
.empty {
  flex: 1;
  align-self: center;
  margin: 0;
  max-width: none;
  padding: 2rem 0;
  text-align: center;
}
</style>
