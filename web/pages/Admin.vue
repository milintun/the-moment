<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { FUTURE_GALLERIES, WING_MIN_PERIOD, client, isAdmin, isOwner } from "../api.ts";

type Group = Extract<Awaited<ReturnType<typeof client.groups.list>>, { list: unknown }>["list"]["groups"][number];
type Category = Extract<Awaited<ReturnType<typeof client.nominations.categories>>, { list: unknown }>["list"]["categories"][number];
type Cycle = Extract<Awaited<ReturnType<(typeof client.admin.cycles)["list"]>>, { list: unknown }>["list"]["cycles"][number];
type Admin = Extract<Awaited<ReturnType<(typeof client.admin.admins)["list"]>>, { list: unknown }>["list"]["admins"][number];
type Nomination = Extract<Awaited<ReturnType<typeof client.admin.nominations.previous>>, { ranking: unknown }>["ranking"]["nominations"][number];

const DAY = 24 * 60 * 60 * 1000;
const BUILDER_KEY = "the-moment.gallery-builder";

const admins = ref<Admin[]>([]);
const groups = ref<Group[]>([]);
const nominations = ref<Category | null>(null); // the Future galleries category
const cycles = ref<Cycle[]>([]);
const previous = ref<Nomination[]>([]);
const error = ref("");
const loaded = ref(false); // render once the first load is done, so nothing flashes

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
  if (!("error" in k)) nominations.value = k.list.categories.find((x) => x.name === FUTURE_GALLERIES) ?? null;
  if (!("error" in c)) cycles.value = c.list.cycles;
  if (nominations.value) {
    const p = await client.admin.nominations.previous({ category: nominations.value.category });
    previous.value = "error" in p ? [] : p.ranking.nominations;
  }
}

// Run an admin call, show its error if any, then reload everything.
async function run(call: Promise<object>) {
  const result = await call;
  error.value = "error" in result ? String(result.error) : "";
  await load();
  return !("error" in result);
}

// ---------- Describing cycles ----------

const days = (ms: number) => +(ms / DAY).toFixed(3);
/** The season running now (counted from 0), or null when none is. */
function seasonNow(c: Cycle) {
  const elapsed = Date.now() - new Date(c.start).getTime();
  const season = Math.floor(elapsed / c.period);
  return elapsed < 0 || season >= c.runs ? null : season;
}
function describeCycle(c: Cycle) {
  const now = seasonNow(c);
  const status = now == null ? "no season running" : `season ${now + 1} of ${c.runs}`;
  return `${days(c.period)}-day seasons, started ${new Date(c.start).toLocaleDateString()} (${status})`;
}
const cycleOf = (item: string) => cycles.value.find((c) => c.items.some((i) => i.item === item)) ?? null;
const groupName = (id: string) => groups.value.find((g) => g.group === id)?.name ?? id;

// ---------- Future gallery nominations ----------

const nominationCycle = computed(() => (nominations.value ? cycleOf(nominations.value.category) : null));
async function followCycle(cycle: string) {
  const category = nominations.value!.category;
  const current = nominationCycle.value;
  if (current?.cycle === cycle) return;
  if (current) await client.admin.cycles["remove-item"]({ cycle: current.cycle, item: category });
  if (cycle) await run(client.admin.cycles["add-item"]({ cycle, item: category }));
  else await load();
}

// ---------- Gallery builder (draft kept in this browser) ----------

type Draft = { name: string; from?: string };
function readDraft(): Draft[] {
  try {
    return JSON.parse(localStorage.getItem(BUILDER_KEY) ?? "[]");
  } catch {
    return [];
  }
}
const draft = ref<Draft[]>(readDraft());
watch(
  draft,
  (value) => {
    try {
      localStorage.setItem(BUILDER_KEY, JSON.stringify(value));
    } catch {
      // Storage unavailable (private window): the draft just won't survive a reload.
    }
  },
  { deep: true },
);
const ownName = ref("");
const builderCycle = ref("");
const builderReport = ref<string[]>([]);
const inDraft = (name: string) => draft.value.some((d) => d.name.trim().toLowerCase() === name.trim().toLowerCase());
function addToDraft(name: string, from?: string) {
  if (name.trim() && !inDraft(name)) draft.value.push({ name: name.trim(), from });
}
async function buildGalleries() {
  builderReport.value = [];
  const remaining: Draft[] = [];
  for (const entry of draft.value) {
    const created = await client.admin.groups.create({ name: entry.name });
    if ("error" in created) {
      builderReport.value.push(`${entry.name}: not created (${created.error === "CONFLICT" ? "name taken" : created.error})`);
      remaining.push(entry);
      continue;
    }
    const added = await client.admin.cycles["add-item"]({ cycle: builderCycle.value, item: created.group });
    builderReport.value.push(`${entry.name}: created${"error" in added ? `, but not added to the cycle (${added.error})` : ""}`);
  }
  draft.value = remaining;
  await load();
}

// ---------- Galleries and wings ----------

const newGalleryName = ref("");
const newGalleryCycle = ref("");
const confirmingGroup = ref<string | null>(null);
async function createGallery() {
  const created = await client.admin.groups.create({ name: newGalleryName.value });
  if ("error" in created) return void (error.value = created.error === "CONFLICT" ? "That name is taken." : created.error);
  if (newGalleryCycle.value) await client.admin.cycles["add-item"]({ cycle: newGalleryCycle.value, item: created.group });
  newGalleryName.value = "";
  error.value = "";
  await load();
}
const kind = (g: Group) => (g.period == null ? "" : g.period >= WING_MIN_PERIOD ? "wing" : "gallery");
function galleryStatus(g: Group) {
  if (g.cycle == null) return "not in a season, so closed";
  if (g.run != null) return `open, season ${g.run + 1} of ${g.runs}`;
  return "closed (no season running)";
}

// ---------- Seasons ----------

const newCycleDays = ref(7);
const newCycleRuns = ref(4);
const runsChoice = ref<Record<string, number>>({});
const confirmingCycle = ref<string | null>(null);

// ---------- People ----------

const newAdmin = ref("");

onMounted(async () => {
  await load();
  loaded.value = true;
});
</script>

<template>
  <h1>Admin</h1>
  <p v-if="!isAdmin">Only admins can use this page.</p>
  <template v-else-if="loaded">
    <p>
      Sections follow the usual order of work: review what people nominated, build the next galleries from it,
      then manage galleries, seasons, and admins.
    </p>
    <p v-if="error">Error: {{ error }}</p>

    <!-- 1. Nominations -->
    <h2>1. Future gallery nominations</h2>
    <p>
      People nominate ideas for future galleries in rounds that follow a cycle's seasons. Use the previous round's
      ranking to choose the next galleries. <RouterLink to="/nominations">See the current round</RouterLink>.
    </p>
    <p v-if="!nominations">Nominations aren't set up yet; restart the server to create them.</p>
    <template v-else>
      <p>
        <label>
          Rounds follow
          <select :value="nominationCycle?.cycle ?? ''" @change="followCycle(($event.target as HTMLSelectElement).value)">
            <option value="">No cycle (nominations closed)</option>
            <option v-for="c in cycles" :key="c.cycle" :value="c.cycle">{{ describeCycle(c) }}</option>
          </select>
        </label>
      </p>
      <p>
        {{ nominations.runEnd ? `Current round open until ${new Date(nominations.runEnd).toLocaleString()}.` : "No round is open right now." }}
      </p>
      <h3>Previous round</h3>
      <p v-if="!previous.length">No nominations in the previous round.</p>
      <ol>
        <li v-for="n in previous" :key="n.nomination">
          {{ n.name }} by {{ n.nominator }} | {{ n.votes }} vote(s)
          <button :disabled="inDraft(n.name)" @click="addToDraft(n.name, n.nominator)">
            {{ inDraft(n.name) ? "In builder" : "Add to builder" }}
          </button>
        </li>
      </ol>
    </template>

    <!-- 2. Builder -->
    <h2>2. Gallery builder</h2>
    <p>
      Collect the next galleries here, from nominations or your own ideas, then create them all at once in a cycle.
      This list is saved in this browser only.
    </p>
    <form @submit.prevent="addToDraft(ownName); ownName = ''">
      <label>Your own idea <input v-model="ownName" /></label>
      <button type="submit">Add to builder</button>
    </form>
    <p v-if="!draft.length">The builder is empty.</p>
    <ul>
      <li v-for="(d, i) in draft" :key="d.name">
        {{ d.name }}{{ d.from ? ` (nominated by ${d.from})` : "" }}
        <button @click="draft.splice(i, 1)">Remove</button>
      </li>
    </ul>
    <p v-if="draft.length">
      <label>
        Create in
        <select v-model="builderCycle">
          <option value="" disabled>Choose a cycle</option>
          <option v-for="c in cycles" :key="c.cycle" :value="c.cycle">{{ describeCycle(c) }}</option>
        </select>
      </label>
      <button :disabled="!builderCycle" @click="buildGalleries">Create {{ draft.length }} galleries</button>
    </p>
    <ul v-if="builderReport.length">
      <li v-for="line in builderReport" :key="line">{{ line }}</li>
    </ul>

    <!-- 3. Galleries -->
    <h2>3. Galleries and wings</h2>
    <p>
      Each gallery or wing is open while its cycle has a season running. Cycles of 30 days or longer make wings.
      Deleting one hides its posts from every feed.
    </p>
    <form @submit.prevent="createGallery">
      <label>Name <input v-model="newGalleryName" required /></label>
      <label>
        in
        <select v-model="newGalleryCycle">
          <option value="">No cycle yet</option>
          <option v-for="c in cycles" :key="c.cycle" :value="c.cycle">{{ describeCycle(c) }}</option>
        </select>
      </label>
      <button type="submit">Create</button>
    </form>
    <ul>
      <li v-for="g in groups" :key="g.group">
        <RouterLink :to="`/galleries/${g.group}`">{{ g.name }}</RouterLink>
        {{ kind(g) ? `(${kind(g)})` : "" }}: {{ galleryStatus(g) }}
        <button v-if="confirmingGroup !== g.group" @click="confirmingGroup = g.group">Delete</button>
        <template v-else>
          Delete {{ g.name }}?
          <button @click="confirmingGroup = null; run(client.admin.groups.delete({ group: g.group }))">Yes, delete</button>
          <button @click="confirmingGroup = null">No</button>
        </template>
      </li>
    </ul>

    <!-- 4. Seasons -->
    <h2>4. Seasons</h2>
    <p>
      A cycle is a run of equal seasons that starts when you create it. Galleries and the nomination rounds in a
      cycle open and close with its seasons. Changing the number of seasons extends a cycle or ends it early.
    </p>
    <form @submit.prevent="run(client.admin.cycles.create({ period: newCycleDays * DAY, runs: newCycleRuns }))">
      <label>Season length (days) <input v-model.number="newCycleDays" type="number" min="0.001" step="any" required /></label>
      <label>Number of seasons <input v-model.number="newCycleRuns" type="number" min="1" step="1" required /></label>
      <button type="submit">Create cycle (starts now)</button>
    </form>
    <div v-for="c in cycles" :key="c.cycle">
      <h3>{{ describeCycle(c) }}</h3>
      <p>
        Holds:
        <template v-if="!c.items.length">nothing</template>
        <template v-for="(m, i) in c.items" :key="m.item">
          <template v-if="i">, </template>
          {{ nominations && m.item === nominations.category ? "future gallery nominations" : groupName(m.item) }}
          <button @click="run(client.admin.cycles['remove-item']({ cycle: c.cycle, item: m.item }))">Remove</button>
        </template>
      </p>
      <p>
        <label>Seasons <input v-model.number="runsChoice[c.cycle]" type="number" min="1" step="1" :placeholder="String(c.runs)" /></label>
        <button @click="run(client.admin.cycles['set-runs']({ cycle: c.cycle, runs: runsChoice[c.cycle] ?? c.runs }))">
          Change number of seasons
        </button>
        <button v-if="confirmingCycle !== c.cycle" @click="confirmingCycle = c.cycle">Delete cycle</button>
        <template v-else>
          Delete this cycle? Everything in it closes.
          <button @click="confirmingCycle = null; run(client.admin.cycles.delete({ cycle: c.cycle }))">Yes, delete</button>
          <button @click="confirmingCycle = null">No</button>
        </template>
      </p>
    </div>

    <!-- 5. People -->
    <h2>5. People</h2>
    <p>Admins can use this page. Only the owner can add or remove admins, and the owner can't be removed.</p>
    <ul>
      <li v-for="a in admins" :key="a.user">
        {{ a.user }}{{ a.owner ? " (owner)" : "" }}
        <button v-if="isOwner && !a.owner" @click="run(client.admin.admins.remove({ user: a.user }))">Remove</button>
      </li>
    </ul>
    <form v-if="isOwner" @submit.prevent="run(client.admin.admins.add({ user: newAdmin })).then((done) => done && (newAdmin = ''))">
      <label>Username <input v-model="newAdmin" required /></label>
      <button type="submit">Add admin</button>
    </form>
  </template>
</template>
