<script setup lang="ts">
import AuthForm from "../components/AuthForm.vue";
import MyNominations from "../components/MyNominations.vue";
import MyPostsList from "../components/MyPostsList.vue";
import PostForm from "../components/PostForm.vue";
import { client, isAdmin, me, refreshMe } from "../api.ts";

// Signing out stays here, where the page turns into the log-in form.
async function signOut() {
  await client.auth["sign-out"]({});
  await refreshMe();
}
</script>

<template>
  <template v-if="!me">
    <h1>Home</h1>
    <p class="lede">log in or register to post, vote, and nominate. this is <span class="highlight">optional</span>. you don't need to be logged in to view artwork.</p>
    <AuthForm next="" />
  </template>
  <template v-else>
    <h1>Home</h1>
    <p class="lede">
      signed in as {{ me }}.
      <button class="link-button" @click="signOut">sign out</button>
    </p>
    <p v-if="isAdmin"><RouterLink class="button admin-button" to="/home/admin">admin</RouterLink></p>
    <section>
      <h2>New post</h2>
      <PostForm />
    </section>
    <section>
      <h2>My posts</h2>
      <MyPostsList />
    </section>
    <section>
      <h2>My nominations</h2>
      <MyNominations />
    </section>
  </template>
</template>

<style scoped>
.highlight {
  color: var(--accent);
}
/* The way into admin: red, so it never passes for an ordinary link. */
.admin-button {
  border-color: var(--alert);
  background: var(--alert);
  color: var(--paper);
}
.button.admin-button:hover {
  background: var(--paper);
  border-color: var(--alert);
  color: var(--alert);
}
</style>
