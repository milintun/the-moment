<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ENTERED_KEY, me } from "../api.ts";
import artist from "../static/entrance/light_artist.png";
import viewer from "../static/entrance/light_viewer.png";

// Clicking anywhere enters the museum; the browser remembers, so later visits skip this page
// (see the route guard in router.ts).
const router = useRouter();

// The figure is half visitor (the canvas, on its left) and half artist (the palette, on its
// right): whichever half of the page the pointer is on lights up that side, and its column.
const side = ref<"visitor" | "artist" | null>(null);
const point = (e: PointerEvent) => {
  if (e.pointerType !== "touch") side.value = e.clientX < window.innerWidth / 2 ? "visitor" : "artist";
};

function enter() {
  try {
    localStorage.setItem(ENTERED_KEY, "yes");
  } catch {
    // Storage unavailable: the entrance will show again next time, which is fine.
  }
  router.push("/map");
}
</script>

<template>
  <div class="entrance" @click="enter" @pointermove="point" @pointerleave="side = null">
    <RouterLink class="entrance-account" :to="me ? '/home' : '/auth'" @click.stop>
      {{ me ? "home" : "register / log in" }}
    </RouterLink>
    <div class="entrance-body">
      <h1>The Moment</h1>
      <p>is a publicly-curated contemporary digital museum.</p>
      <div class="entrance-columns">
        <p :class="{ active: side === 'visitor' }">Visitors view posts, sorted by recency and votes, and upvote it if they resonate with it.</p>
        <div class="entrance-figure" aria-hidden="true">
          <img :src="viewer" :class="{ shown: side !== 'artist' }" alt="" />
          <img :src="artist" :class="{ shown: side === 'artist' }" alt="" />
        </div>
        <p :class="{ active: side === 'artist' }">Artists post their work.</p>
      </div>
      <p>
        Like a physical museum, the digital museum is divided into Wings and Galleries in order to organize the large
        collection of pieces and to celebrate popular art for a diversity of characteristics. To constantly promote fresh
        art and new categories, Seasons exist to limit the time a Wing or Gallery remains active for.
      </p>
      <p class="enter-hint">click anywhere to enter</p>
    </div>
  </div>
</template>

<style scoped>
.entrance {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--gutter);
  cursor: pointer;
  position: relative;
}
.entrance-account {
  position: absolute;
  top: var(--gutter);
  right: var(--gutter);
}
.entrance-body {
  max-width: 60ch;
}
.entrance-columns {
  display: grid;
  grid-template-columns: minmax(0, 22ch) 120px minmax(0, 22ch);
  align-items: center;
  gap: 1.5rem;
  margin: 5em 0;
}
.entrance-columns p {
  margin: 0;
  transition: color 0.2s;
}
.entrance-columns p:first-child {
  text-align: right;
}
.entrance-columns p.active {
  color: var(--accent);
}
/* The two drawings stacked; the one for the side the pointer is on shows. */
.entrance-figure {
  display: grid;
}
.entrance-figure img {
  grid-area: 1 / 1;
  width: 100%;
  opacity: 0;
  transition: opacity 0.2s;
}
.entrance-figure img.shown {
  opacity: 1;
}
@media (max-width: 480px) {
  .entrance-columns {
    grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr);
    gap: 0.8rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .entrance-columns p,
  .entrance-figure img {
    transition: none;
  }
}
.entrance h1 {
  font-size: clamp(2rem, 6vw, 3.2rem);
}
.enter-hint {
  margin-top: 3em;
  animation: blink 1.6s steps(2, start) infinite;
}
@keyframes blink {
  to {
    visibility: hidden;
  }
}
@media (prefers-reduced-motion: reduce) {
  .enter-hint {
    animation: none;
  }
}
</style>
