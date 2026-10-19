<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ADMIN, client, me } from "../api.ts";

type Group = Extract<Awaited<ReturnType<typeof client.groups.list>>, { list: unknown }>["list"]["groups"][number];
type Cycle = Extract<Awaited<ReturnType<(typeof client.admin.cycles)["list"]>>, { list: unknown }>["list"]["cycles"][number];

const DAY = 24 * 60 * 60 * 1000;

const groups = ref<Group[]>([]);
const cycles = ref<Cycle[]>([]);
const error = ref("");

const newGroupName = ref("");
const newCycleDays = ref(7);
const newCycleRuns = ref(4);
const addGroupChoice = ref<Record<string, string>>({}); // cycle -> group to add
const runsChoice = ref<Record<string, number>>({}); // cycle -> new runs

async function load() {
  const [g, c] = await Promise.all([client.groups.list({}), client.admin.cycles.list({})]);
  if ("error" in g) return void (error.value = g.error);
  if ("error" in c) return void (error.value = c.error);
  groups.value = g.list.groups;
  cycles.value = c.list.cycles;
}

// Run an admin call, show its error if any, then reload everything.
async function run(call: Promise<object>) {
  const result = await call;
  error.value = "error" in result ? String(result.error) : "";
  await load();
}

const groupName = (id: string) => groups.value.find((g) => g.group === id)?.name ?? id;
const days = (ms: number) => ms / DAY;

onMounted(load);
</script>

<template>
  <h1>Admin</h1>
  <p v-if="me !== ADMIN">Only the admin can use this page.</p>
  <template v-else>
    <p v-if="error">Error: {{ error }}</p>

    <h2>Groups</h2>
    <form @submit.prevent="run(client.admin.groups.create({ name: newGroupName }))">
      <label>Name <input v-model="newGroupName" required /></label>
      <button type="submit">Create group</button>
    </form>
    <ul>
      <li v-for="g in groups" :key="g.group">
        {{ g.name }} ({{ g.cycle ? `in a ${days(g.period!)}-day cycle` : "no cycle" }})
        <button @click="run(client.admin.groups.delete({ group: g.group }))">Delete</button>
      </li>
    </ul>

    <h2>Cycles</h2>
    <form @submit.prevent="run(client.admin.cycles.create({ period: newCycleDays * DAY, runs: newCycleRuns }))">
      <label>Period (days) <input v-model.number="newCycleDays" type="number" min="0.001" step="any" required /></label>
      <label>Runs <input v-model.number="newCycleRuns" type="number" min="1" step="1" required /></label>
      <button type="submit">Create cycle (starts now)</button>
    </form>
    <div v-for="c in cycles" :key="c.cycle">
      <h3>{{ days(c.period) }}-day cycle, {{ c.runs }} run(s), started {{ new Date(c.start).toLocaleString() }}</h3>
      <p>
        <button @click="run(client.admin.cycles.delete({ cycle: c.cycle }))">Delete cycle</button>
        <label>Runs <input v-model.number="runsChoice[c.cycle]" type="number" min="1" step="1" /></label>
        <button @click="run(client.admin.cycles['set-runs']({ cycle: c.cycle, runs: runsChoice[c.cycle] ?? c.runs }))">
          Set runs
        </button>
      </p>
      <p>Items:</p>
      <ul>
        <li v-for="m in c.items" :key="m.item">
          {{ groupName(m.item) }}
          <button @click="run(client.admin.cycles['remove-item']({ cycle: c.cycle, item: m.item }))">Remove</button>
        </li>
      </ul>
      <p>
        <select v-model="addGroupChoice[c.cycle]">
          <option v-for="g in groups.filter((g) => !g.cycle)" :key="g.group" :value="g.group">{{ g.name }}</option>
        </select>
        <button
          :disabled="!addGroupChoice[c.cycle]"
          @click="run(client.admin.cycles['add-item']({ cycle: c.cycle, item: addGroupChoice[c.cycle]! }))"
        >
          Add group
        </button>
      </p>
    </div>
  </template>
</template>
