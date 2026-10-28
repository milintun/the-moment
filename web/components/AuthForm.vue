<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { client, refreshMe } from "../api.ts";
import { explain } from "../errors.ts";
import ErrorNote from "./ErrorNote.vue";

// Register or log in, then go to `next` (or stay put when next is empty).
const props = withDefaults(defineProps<{ next?: string }>(), { next: "/home" });
const router = useRouter();
const username = ref("");
const password = ref("");
const error = ref("");

async function submit(action: "register" | "sign-in") {
  const result = await client.auth[action]({ username: username.value, password: password.value });
  if ("error" in result) {
    // A bad username and a bad password are both INVALID_REQUEST; what was typed tells which.
    const name = username.value.length;
    const ties = { INVALID_REQUEST: name < 3 || name > 32 ? "usernames need 3 to 32 characters." : "passwords need 8 to 128 characters." };
    error.value = explain(`/auth/${action}`, result.error, ties);
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
    <p v-if="error"><ErrorNote :problem="error" /></p>
  </form>
</template>

<style scoped>
/* As wide as its fields: each label a gap away from its field, the fields lined up, and the
   buttons ending where the fields do. */
.auth {
  width: max-content;
  max-width: 100%;
}
.auth label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2em;
  margin-right: 0;
}
.buttons {
  text-align: right;
}
.buttons button:last-child {
  margin-right: 0;
}
</style>
