<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { client, refreshMe } from "../api.ts";

// Register or log in, then go to `next` (or stay put when next is empty).
const props = withDefaults(defineProps<{ next?: string }>(), { next: "/home" });
const router = useRouter();
const username = ref("");
const password = ref("");
const error = ref("");

async function submit(action: "register" | "sign-in") {
  const result = await client.auth[action]({ username: username.value, password: password.value });
  if ("error" in result) {
    error.value =
      result.error === "CONFLICT" ? "that username is taken." :
      result.error === "UNAUTHORIZED" ? "wrong username or password." :
      result.error === "INVALID_REQUEST" ? "usernames need 3 to 32 characters, passwords 8 to 128." : result.error;
    return;
  }
  await refreshMe(); // also learns whether this account is an admin
  if (props.next) router.push(props.next);
}
</script>

<template>
  <form class="auth" @submit.prevent="submit('sign-in')">
    <p><label>username <input v-model="username" autocomplete="username" required /></label></p>
    <p><label>password <input v-model="password" type="password" autocomplete="current-password" required /></label></p>
    <p class="buttons">
      <button type="submit">log in</button>
      <button type="button" @click="submit('register')">register</button>
    </p>
    <p v-if="error" class="error">{{ error }}</p>
  </form>
</template>
