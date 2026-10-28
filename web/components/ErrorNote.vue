<script setup lang="ts">
import { computed } from "vue";
import { SESSION_ENDED, type Problem } from "../errors.ts";

// An error message, styled, next to what failed. A page with several spots that can fail passes
// a Problem and the spot (`at`) this note stands at; a form with one spot passes the message.
const props = defineProps<{ problem: Problem | string | null; at?: string }>();
const message = computed(() =>
  typeof props.problem === "string" ? props.problem : props.problem?.at === props.at ? props.problem?.message : "",
);
</script>

<template>
  <span v-if="message" class="error" role="alert">
    {{ message }}
    <RouterLink v-if="message === SESSION_ENDED" to="/auth">log in</RouterLink>
  </span>
</template>

<style scoped>
/* Plain text, like everything else on the page; its place beside what failed says what it's about. */
</style>
