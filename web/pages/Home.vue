<script setup lang="ts">
import { useRouter } from "vue-router";
import AuthForm from "../components/AuthForm.vue";
import MyNominations from "../components/MyNominations.vue";
import MyPostsList from "../components/MyPostsList.vue";
import PostForm from "../components/PostForm.vue";
import { client, isAdmin, me, refreshMe } from "../api.ts";

const router = useRouter();

async function signOut() {
  await client.auth["sign-out"]({});
  await refreshMe();
  router.push("/map");
}
</script>

<template>
  <template v-if="!me">
    <h1>Home</h1>
    <p class="lede">log in or register to post, vote, and nominate.</p>
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
