<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import AuthForm from "../components/AuthForm.vue";
import PostForm from "../components/PostForm.vue";
import { client, me } from "../api.ts";

const group = useRoute().params.id as string;
const name = ref("");
const loaded = ref(false);
onMounted(async () => {
  const list = await client.groups.list({});
  name.value = "error" in list ? "" : list.list.groups.find((g) => g.group === group)?.name ?? "";
  loaded.value = true;
});
</script>

<template>
  <h1 v-if="loaded">Post to {{ name || "a gallery" }}</h1>
  <template v-if="me">
    <PostForm :group="group" />
  </template>
  <template v-else>
    <p class="lede">log in or register to post.</p>
    <AuthForm next="" />
  </template>
  <p><RouterLink :to="`/galleries/${group}`">back to {{ name || "the gallery" }}</RouterLink></p>
</template>
