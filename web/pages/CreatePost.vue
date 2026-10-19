<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { client } from "../api.ts";

const group = useRoute().params.id as string;
const router = useRouter();
const content = ref("");
const caption = ref("");
const error = ref("");

async function submit() {
  const result = await client.posts.create({ group, content: content.value, caption: caption.value });
  if ("error" in result) {
    error.value = result.error;
    return;
  }
  router.push(`/groups/${group}`);
}
</script>

<template>
  <h1>New post</h1>
  <form @submit.prevent="submit">
    <p><label>Image URL <input v-model="content" type="url" required size="60" /></label></p>
    <p><label>Caption (optional)<br /><textarea v-model="caption" rows="3" cols="60"></textarea></label></p>
    <p><button type="submit">Post</button></p>
  </form>
  <p v-if="content"><img :src="content" alt="Preview" width="300" /></p>
  <p v-if="error">Error: {{ error }}</p>
  <p><RouterLink :to="`/groups/${group}`">Back</RouterLink></p>
</template>
