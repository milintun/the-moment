<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { client, me } from "../api.ts";

const router = useRouter();
const username = ref("");
const password = ref("");
const error = ref("");

async function submit(action: "register" | "sign-in") {
  const result = await client.auth[action]({ username: username.value, password: password.value });
  if ("error" in result) {
    error.value = result.error;
    return;
  }
  me.value = result.account;
  router.push("/");
}
</script>

<template>
  <h1>Log in or register</h1>
  <form @submit.prevent="submit('sign-in')">
    <p><label>Username <input v-model="username" required /></label></p>
    <p><label>Password <input v-model="password" type="password" required /></label></p>
    <p>
      <button type="submit">Log in</button>
      <button type="button" @click="submit('register')">Register</button>
    </p>
  </form>
  <p v-if="error">Error: {{ error }}</p>
</template>
