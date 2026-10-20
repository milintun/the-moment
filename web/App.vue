<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { me } from "./api.ts";

const route = useRoute();
// The entrance is a full-screen landing page with its own account link.
const atEntrance = computed(() => route.path === "/");
</script>

<template>
  <RouterView v-if="atEntrance" />
  <template v-else>
    <header class="topbar">
      <RouterLink to="/map" class="brand">the moment · map</RouterLink>
      <RouterLink :to="me ? '/home' : '/auth'">{{ me ? `home (${me})` : "register / log in" }}</RouterLink>
    </header>
    <main class="page">
      <RouterView :key="route.fullPath" />
    </main>
  </template>
</template>
