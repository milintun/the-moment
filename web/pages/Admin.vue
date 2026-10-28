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

<style scoped>
.admin {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 2.5rem;
  align-items: start;
}
.admin-nav {
  position: sticky;
  top: 4rem;
  display: flex;
  flex-direction: column;
  border-left: var(--line);
}
.admin-nav a {
  padding: 0.4em 0 0.4em 1em;
  text-decoration: none;
}
.admin-nav a.active {
  font-weight: 700;
  border-left: 3px solid var(--ink);
  margin-left: -2px;
}
.admin-section > :deep(h2:first-child) {
  margin-top: 0;
}

@media (max-width: 720px) {
  .admin {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  .admin-nav {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    border-left: 0;
    border-bottom: var(--line);
  }
  .admin-nav a.active {
    border-left: 0;
    margin-left: 0;
  }
}
</style>
