<script setup lang="ts">
import { ref, watch } from "vue";
import AuthForm from "../components/AuthForm.vue";
import MyNominations from "../components/MyNominations.vue";
import MyPostsList from "../components/MyPostsList.vue";
import NominateButton from "../components/NominateButton.vue";
import PostWindow from "../components/PostWindow.vue";
import WallOrder from "../components/WallOrder.vue";
import { FUTURE_GALLERIES, client, isAdmin, me, refreshMe, type WallSort } from "../api.ts";

// Signed in, home is two lists, each with its way to add to it on the right: my posts (sorted
// like a gallery's wall, with POST +) and my nominations (with NOMINATE + while a round is open).
// Adding something reloads its list.
const order = ref<WallSort>("votes");
const postsLoaded = ref(0); // bumped to reload my posts
const nominationsLoaded = ref(0); // bumped to reload my nominations
const category = ref<string | null>(null); // Future galleries, while its round is open
// Looked up once signed in, including signing in right here.
watch(
  me,
  async (who) => {
    if (!who) return;
    const categories = await client.nominations.categories({});
    const found = "error" in categories ? undefined : categories.list.categories.find((c) => c.name === FUTURE_GALLERIES);
    category.value = found?.runEnd && new Date(found.runEnd).getTime() > Date.now() ? found.category : null;
  },
  { immediate: true },
);

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
      <div class="section-head">
        <h2>my posts</h2>
        <WallOrder v-model="order" />
        <div class="section-tools">
          <PostWindow title="new post" label="+" @posted="postsLoaded++" />
        </div>
      </div>
      <MyPostsList :key="postsLoaded" :order="order" />
    </section>
    <section>
      <div class="section-head">
        <h2>my nominations</h2>
        <div class="section-tools">
          <NominateButton v-if="category" :category="category" label="+" @nominated="nominationsLoaded++" />
        </div>
      </div>
      <MyNominations :key="nominationsLoaded" />
    </section>
  </template>
</template>

<style scoped>
/* Each list's heading line: its name on the left, what you can do with it on the right. */
.section-head {
  clear: right; /* below the mini map, so every list spans the page */
  display: flex;
  align-items: center;
  gap: 0.4em; /* "my posts sorted by …" reads as one title */
  margin: 2.4em 0 1rem;
  padding-bottom: 0.4em;
  border-bottom: var(--line);
}
.section-head h2 {
  margin: 0;
  padding: 0;
  border: 0;
}
.section-tools {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: auto;
}
/* The bare + buttons, big enough to read as the way to add. */
.section-tools :deep(.accent-button) {
  font-size: 1.5rem;
  line-height: 1;
  padding: 0.05em 0.4em 0.2em;
}
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
