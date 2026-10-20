<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { client, isAdmin, me, refreshMe } from "./api.ts";

const router = useRouter();
onMounted(refreshMe);

async function signOut() {
  await client.auth["sign-out"]({});
  await refreshMe();
  router.push("/");
}
</script>

<template>
  <header>
    <RouterLink to="/">The Moment</RouterLink> | <RouterLink to="/archive">Archive</RouterLink> |
    <RouterLink to="/nominations">Future galleries</RouterLink>
    <template v-if="me">
      | <RouterLink to="/me">My posts</RouterLink> | Signed in as {{ me }}
      <template v-if="isAdmin"> | <RouterLink to="/admin">Admin</RouterLink></template>
      | <button @click="signOut">Sign out</button>
    </template>
    <template v-else> | <RouterLink to="/login">Log in or register</RouterLink></template>
  </header>
  <hr />
  <RouterView />
</template>
