<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import NewSchedule from "../components/admin/NewSchedule.vue";
import People from "../components/admin/People.vue";
import Schedules from "../components/admin/Schedules.vue";
import { isAdmin } from "../api.ts";

// One section at a time, picked from the sidebar; each has its own address so refresh and back work.
const SECTIONS = [
  { key: "new", label: "new schedule" },
  { key: "schedules", label: "schedules" },
  { key: "people", label: "people" },
] as const;
const route = useRoute();
const section = computed(() => (route.params.section as string | undefined) || "new");
</script>

<template>
  <h1>Admin</h1>
  <p v-if="!isAdmin">only admins can use this page.</p>
  <div v-else class="admin">
    <nav class="admin-nav" aria-label="admin sections">
      <RouterLink
        v-for="s in SECTIONS"
        :key="s.key"
        :to="`/home/admin/${s.key}`"
        :class="{ active: section === s.key }"
        :aria-current="section === s.key ? 'page' : undefined"
      >
        {{ s.label }}
      </RouterLink>
    </nav>
    <section class="admin-section">
      <NewSchedule v-if="section === 'new'" />
      <Schedules v-else-if="section === 'schedules'" />
      <People v-else-if="section === 'people'" />
      <p v-else>there's no such section. <RouterLink to="/home/admin">back to admin</RouterLink></p>
    </section>
  </div>
</template>
