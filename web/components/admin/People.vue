<script setup lang="ts">
import { onMounted, ref } from "vue";
import { client, isOwner } from "../../api.ts";
import { explain, type Problem } from "../../errors.ts";
import ErrorNote from "../ErrorNote.vue";

type Admin = Extract<Awaited<ReturnType<(typeof client.admin.admins)["list"]>>, { list: unknown }>["list"]["admins"][number];

const admins = ref<Admin[]>([]);
const newAdmin = ref("");
const problem = ref<Problem | null>(null); // at "page", "add", or a username

async function load() {
  const result = await client.admin.admins.list({});
  if ("error" in result) problem.value = { at: "page", message: explain("/admin/admins/list", result.error) };
  else admins.value = result.list.admins;
}
onMounted(load);

async function add() {
  const result = await client.admin.admins.add({ user: newAdmin.value });
  problem.value = "error" in result ? { at: "add", message: explain("/admin/admins/add", result.error) } : null;
  if (!("error" in result)) newAdmin.value = "";
  await load();
}

async function remove(user: string) {
  const result = await client.admin.admins.remove({ user });
  problem.value = "error" in result ? { at: user, message: explain("/admin/admins/remove", result.error) } : null;
  await load();
}
</script>

<template>
  <h2>People</h2>
  <p class="lede">admins can use this page. only the owner can add or remove admins, and the owner can't be removed.</p>
  <p v-if="problem?.at === 'page'"><ErrorNote :problem="problem" at="page" /></p>
  <ul class="rows">
    <li v-for="a in admins" :key="a.user">
      {{ a.user }}{{ a.owner ? " (owner)" : "" }}
      <button v-if="isOwner && !a.owner" @click="remove(a.user)">remove</button>
      <ErrorNote :problem="problem" :at="a.user" />
    </li>
  </ul>
  <form v-if="isOwner" @submit.prevent="add">
    <label>username <input v-model="newAdmin" required /></label>
    <button type="submit">add admin</button>
    <ErrorNote :problem="problem" at="add" />
  </form>
</template>
