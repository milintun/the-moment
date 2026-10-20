<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { client, isAdmin, isOwner } from "../api.ts";

type Group = Extract<Awaited<ReturnType<typeof client.groups.list>>, { list: unknown }>["list"]["groups"][number];
type Category = Extract<Awaited<ReturnType<typeof client.nominations.categories>>, { list: unknown }>["list"]["categories"][number];
type Cycle = Extract<Awaited<ReturnType<(typeof client.admin.cycles)["list"]>>, { list: unknown }>["list"]["cycles"][number];
type Admin = Extract<Awaited<ReturnType<(typeof client.admin.admins)["list"]>>, { list: unknown }>["list"]["admins"][number];
type Nomination = Extract<Awaited<ReturnType<typeof client.admin.nominations.previous>>, { ranking: unknown }>["ranking"]["nominations"][number];

const DAY = 24 * 60 * 60 * 1000;

const admins = ref<Admin[]>([]);
const groups = ref<Group[]>([]);
const categories = ref<Category[]>([]);
const cycles = ref<Cycle[]>([]);
const previous = ref<Record<string, Nomination[]>>({}); // category -> last round's ranking, once asked for
const error = ref("");

const newAdmin = ref("");
const newGroupName = ref("");
const newCategoryName = ref("");
const newCycleDays = ref(7);
const newCycleRuns = ref(4);
const addItemChoice = ref<Record<string, string>>({}); // cycle -> group or category to add
const runsChoice = ref<Record<string, number>>({}); // cycle -> new runs

async function load() {
  const [a, g, k, c] = await Promise.all([
    client.admin.admins.list({}),
    client.groups.list({}),
    client.nominations.categories({}),
    client.admin.cycles.list({}),
  ]);
  for (const result of [a, g, k, c]) if ("error" in result) return void (error.value = result.error);
  if (!("error" in a)) admins.value = a.list.admins;
  if (!("error" in g)) groups.value = g.list.groups;
  if (!("error" in k)) categories.value = k.list.categories;
  if (!("error" in c)) cycles.value = c.list.cycles;
}

// Run an admin call, show its error if any, then reload everything.
async function run(call: Promise<object>) {
  const result = await call;
  error.value = "error" in result ? String(result.error) : "";
  await load();
}

async function showPrevious(category: string) {
  const result = await client.admin.nominations.previous({ category });
  if ("error" in result) error.value = result.error;
  else previous.value = { ...previous.value, [category]: result.ranking.nominations };
}

// Groups and categories can both belong to a cycle, so name them either way.
const inACycle = computed(() => new Set(cycles.value.flatMap((c) => c.items.map((i) => i.item))));
const itemName = (id: string) =>
  groups.value.find((g) => g.group === id)?.name ?? categories.value.find((c) => c.category === id)?.name ?? id;
const itemKind = (id: string) => (categories.value.some((c) => c.category === id) ? "category" : "gallery");
const addable = computed(() => [
  ...groups.value.filter((g) => !inACycle.value.has(g.group)).map((g) => ({ id: g.group, label: `${g.name} (gallery)` })),
  ...categories.value
    .filter((c) => !inACycle.value.has(c.category))
    .map((c) => ({ id: c.category, label: `${c.name} (category)` })),
]);
const days = (ms: number) => ms / DAY;

onMounted(load);
</script>

<template>
  <h1>Admin</h1>
  <p v-if="!isAdmin">Only admins can use this page.</p>
  <template v-else>
    <p v-if="error">Error: {{ error }}</p>

    <h2>Admins</h2>
    <ul>
      <li v-for="a in admins" :key="a.user">
        {{ a.user }}{{ a.owner ? " (owner)" : "" }}
        <button v-if="isOwner && !a.owner" @click="run(client.admin.admins.remove({ user: a.user }))">Remove</button>
      </li>
    </ul>
    <form v-if="isOwner" @submit.prevent="run(client.admin.admins.add({ user: newAdmin }))">
      <label>Username <input v-model="newAdmin" required /></label>
      <button type="submit">Add admin</button>
    </form>
    <p v-else>Only the owner can add or remove admins.</p>

    <h2>Galleries and wings</h2>
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

    <h2>Nomination categories</h2>
    <form @submit.prevent="run(client.admin.categories.create({ name: newCategoryName }))">
      <label>Name <input v-model="newCategoryName" required /></label>
      <button type="submit">Create category</button>
    </form>
    <div v-for="c in categories" :key="c.category">
      <p>
        <RouterLink :to="`/nominations/${c.category}`">{{ c.name }}</RouterLink>
        ({{ c.run != null ? `round open until ${new Date(c.runEnd!).toLocaleString()}` : inACycle.has(c.category) ? "closed" : "not in a cycle" }})
        <button @click="showPrevious(c.category)">Previous round</button>
      </p>
      <template v-if="previous[c.category]">
        <p v-if="!previous[c.category]!.length">No nominations in the previous round.</p>
        <ol>
          <li v-for="n in previous[c.category]" :key="n.nomination">
            {{ n.name }} by {{ n.nominator }} | {{ n.votes }} vote(s)
          </li>
        </ol>
      </template>
    </div>

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
          {{ itemName(m.item) }} ({{ itemKind(m.item) }})
          <button @click="run(client.admin.cycles['remove-item']({ cycle: c.cycle, item: m.item }))">Remove</button>
        </li>
      </ul>
      <p>
        <select v-model="addItemChoice[c.cycle]">
          <option v-for="option in addable" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select>
        <button
          :disabled="!addItemChoice[c.cycle]"
          @click="run(client.admin.cycles['add-item']({ cycle: c.cycle, item: addItemChoice[c.cycle]! }))"
        >
          Add item
        </button>
      </p>
    </div>
  </template>
</template>
