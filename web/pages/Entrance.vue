<script setup lang="ts">
import { useRouter } from "vue-router";
import { ENTERED_KEY, me } from "../api.ts";

// Clicking anywhere enters the museum; the browser remembers, so later visits skip this page
// (see the route guard in router.ts).
const router = useRouter();

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
  <div class="entrance" @click="enter">
    <RouterLink class="entrance-account" :to="me ? '/home' : '/auth'" @click.stop>
      {{ me ? "home" : "register / log in" }}
    </RouterLink>
    <div class="entrance-body">
      <h1>The Moment</h1>
      <p>
        is a publicly-curated contemporary digital museum. Artists post their work while visitors view posts, sorted by recency and votes, and upvote it if they resonate with it. Like a physical museum, the digital museum is divided into Wings and Galleries in order to organize the large collection of pieces and to celebrate popular art for a diversity of characteristics. To constantly promote fresh art and new categories, Seasons exist to limit the time a Wing or Gallery remains active for. 
      </p>
      <p class="enter-hint">click anywhere to enter</p>
    </div>
  </div>
</template>
