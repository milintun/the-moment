<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { me } from "../api.ts";
import artist from "../static/entrance/light_artist.png";
import viewer from "../static/entrance/light_viewer.png";

/** Pixels: on screens narrower than this, there's no doorway: the text sits alone in the middle, with an enter button. */
const ALONE_BELOW = 1200;

// The doorway (or, on narrow screens, the enter button) goes into the museum.
const router = useRouter();

const narrow = window.matchMedia?.(`(max-width: ${ALONE_BELOW}px)`);
const stacked = ref(narrow?.matches ?? false);
const realign = (e: MediaQueryListEvent) => (stacked.value = e.matches);
narrow?.addEventListener("change", realign);
onBeforeUnmount(() => narrow?.removeEventListener("change", realign));

// The doorway's "enter" is set at the page's text size, whatever size the drawing is drawn at.
const doorway = ref<SVGSVGElement>();
const labelSize = ref(2); // in the drawing's units
watch(doorway, (svg, _old, onCleanup) => {
  if (!svg) return;
  const size = () => {
    const perUnit = svg.getBoundingClientRect().height / 70.44;
    if (perUnit) labelSize.value = parseFloat(getComputedStyle(svg).fontSize) / perUnit;
  };
  size();
  if (typeof ResizeObserver === "undefined") return;
  const observer = new ResizeObserver(size);
  observer.observe(svg);
  onCleanup(() => observer.disconnect());
});

// The figure is half visitor (the canvas, on its left) and half artist (the palette, on its
// right): pointing at the figure or a blurb lights up that half, and its blurb.
// The last side pointed at stays (its drawing, and the other blurb dimmed) after the pointer
// leaves; only the accent on the blurb goes. Before any pointing, the visitor's side shows.
const side = ref<"visitor" | "artist" | null>(null);
const pointing = ref(false);
const shown = computed(() => side.value ?? "visitor");
const point = (e: PointerEvent) => {
  if (e.pointerType === "touch") return;
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
  side.value = e.clientX < box.left + box.width / 2 ? "visitor" : "artist"; // the figure sits in the middle
  pointing.value = true;
};

const enter = () => router.push("/map");
</script>

<template>
  <div :class="['entrance', { stacked }]">
    <div class="entrance-body">
      <h1>The Moment</h1>
      <p>a publicly-curated contemporary digital museum</p>
      <div class="entrance-columns" @pointermove="point" @pointerleave="pointing = false">
        <p :class="{ active: pointing && side === 'visitor', dim: shown !== 'visitor' }">
          as a visitor,<br />browse through fresh artwork and upvote it if you resonate with it
        </p>
        <div class="entrance-figure" aria-hidden="true">
          <img :src="viewer" :class="{ shown: shown === 'visitor' }" alt="" />
          <img :src="artist" :class="{ shown: shown === 'artist' }" alt="" />
        </div>
        <p :class="{ active: pointing && side === 'artist', dim: shown !== 'artist' }">as an artist,<br />post your artwork to galleries and look for inspo</p>
      </div>
      <p>
        Like physical museums, <span class="name">the moment</span> is divided into constantly rotating Wings and Galleries to organize the large
        collection of pieces and celebrate artwork for a diversity of characteristics.
      </p>
      <p v-if="stacked" class="enter"><button type="button" @click="enter">enter</button></p>
    </div>

    <!-- The doorway, and the way in: light from an open door (top right) pouring across the floor
         toward the text. Pointing at it lights it in the accent colour, with "enter" in the doorway.
         Beside the text it's drawn large and anchored to the bottom right, so the screen crops it. -->
    <svg v-if="!stacked" ref="doorway" class="doorway" viewBox="0 0 138.37 70.44">
      <a class="doorway-link" href="/map" aria-label="enter the museum" @click.prevent="enter">
        <polyline points=".5 65.43 .5 69.94 111.77 69.57 137.87 39.52 137.87 .5 117.96 .5 131.53 3.55 131.53 35.94 .5 65.43" />
        <circle class="knob" cx="131.93" cy="19.77" r=".4" />
        <text class="enter-label" :font-size="labelSize" aria-hidden="true">enter</text>
      </a>
    </svg>
  </div>
</template>

<style scoped>
/* One screen, never scrolling: the text on the left, the doorway behind it to the bottom right.
   Narrower than ALONE_BELOW (in the script), there's no doorway: the text alone, centred, with an enter button. */
.entrance {
  /* ---- the doorway: edit these to move or resize it ---- */
  --doorway-height: min(85dvh, 55vw); /* how tall it is (its width follows) */
  --doorway-right: 15vw; /* distance from the right edge; negative pushes it off screen */
  --doorway-bottom: -10vw; /* distance from the bottom edge; negative pushes it off screen */
  --doorway-color: var(--ink); /* its fill */
  /* ---- the text ---- */
  --text-left: 20vw; /* how far the text starts from the left edge */

  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: grid;
  align-items: center;
  position: relative;
}
.entrance-body {
  margin-left: var(--text-left);
  position: relative; /* above the doorway */
  z-index: 1;
  max-width: calc(60ch + var(--gutter) * 6);
  padding: var(--gutter) calc(var(--gutter) * 3);
}
.doorway {
  position: absolute;
  right: var(--doorway-right);
  bottom: var(--doorway-bottom);
  height: var(--doorway-height);
  width: auto;
  overflow: visible;
  transform: translate(0.6%, 1%); /* past the drawing's half-unit margin, flush with the screen's edges */
}
/* Only the drawn shape is the link, not the empty corners of its box. */
.doorway {
  pointer-events: none;
}
.doorway-link {
  pointer-events: auto;
  cursor: pointer;
  text-decoration: none;
}
.doorway-link:focus-visible {
  outline: none; /* lighting up in the accent colour shows the focus */
}
.doorway polyline,
.doorway .knob {
  fill: var(--doorway-color);
  stroke: var(--paper);
  stroke-miterlimit: 10;
  transition: fill 0.3s;
}
.doorway .knob {
  fill: none;
}
.enter-label {
  /* Where "enter" sits, in the drawing's units (px here means one unit of the 138.37 × 70.44 drawing). */
  --enter-x: 134.7px; /* across: the middle of the doorway strip */
  --enter-y: 19.5px; /* down the doorway: bigger is lower */
  --enter-turn: 90deg; /* reads top to bottom */
  transform: translate(var(--enter-x), var(--enter-y)) rotate(var(--enter-turn));
  transform-box: fill-box;
  transform-origin: center;
  fill: var(--paper);
  font-family: var(--font);
  /* transform: translateX(0.05vh); */
  letter-spacing: 0.05em; /* the body's, but of this text's own size (inheriting would take the page's pixels) */
  text-anchor: middle;
  dominant-baseline: central;
  opacity: 0;
  transition: opacity 0.3s;
}
.doorway-link:hover polyline,
.doorway-link:focus-visible polyline {
  fill: var(--accent);
}
.doorway-link:hover .enter-label,
.doorway-link:focus-visible .enter-label {
  opacity: 1;
}
/* Without a pointer to hover, "enter" always shows. */
@media (hover: none) {
  .enter-label {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .doorway polyline,
  .enter-label {
    transition: none;
  }
}

/* Without the doorway: the text by itself, in the middle. */
.stacked .entrance-body {
  margin-inline: auto;
}
.enter {
  margin-top: 3em;
}
.entrance-columns {
  display: grid;
  grid-template-columns: minmax(0, 22ch) 120px minmax(0, 22ch);
  align-items: start;
  gap: 1.5rem;
  margin: 5em 0;
}
.entrance-columns p {
  margin: 0;
  transition:
    color 0.2s,
    opacity 0.2s;
}
.entrance-columns p:first-child {
  text-align: right;
}
/* As faded as the drawing's dimmed half (black at 33%). */
.entrance-columns p.dim {
  opacity: 0.33;
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
.name {
  color: var(--accent);
}
</style>
