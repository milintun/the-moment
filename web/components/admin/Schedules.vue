<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { WING_MIN_PERIOD, client, repeatedName, useNow } from "../../api.ts";
import { explain, type Problem } from "../../errors.ts";
import ErrorNote from "../ErrorNote.vue";
import GalleryPicker, { type PickedGallery } from "./GalleryPicker.vue";

// Every schedule, read only until an admin edits it: change its number of seasons, remove a
// gallery (from the next season, or outright before it starts), and before it starts, add
// galleries or cancel it.

type Schedule = Extract<Awaited<ReturnType<typeof client.admin.schedules.list>>, { list: unknown }>["list"]["schedules"][number];
type Gallery = Schedule["galleries"][number];

const DAY = 24 * 60 * 60 * 1000;
const route = useRoute();
const now = useNow();
const schedules = ref<Schedule[]>([]);
const problem = ref<Problem | null>(null); // at "page", a cycle, `${cycle}|${group}`, or `${cycle}|add`
const confirming = ref<string | null>(null); // the cycle or `${cycle}|${group}` waiting for "yes"
const runsChoice = ref<Record<string, number>>({});
const loaded = ref(false);
const editing = ref<string | null>(null); // the cycle in edit mode, one at a time
const adding = ref<PickedGallery[]>([]); // galleries to add to the one being edited
const picker = ref<Array<InstanceType<typeof GalleryPicker>>>([]); // inside v-for, so a list; only the edited one renders
const made = route.query.made as string | undefined; // set after creating a schedule

async function load() {
  const result = await client.admin.schedules.list({});
  if ("error" in result) return void (problem.value = { at: "page", message: explain("/admin/schedules/list", result.error) });
  schedules.value = result.list.schedules;
  runsChoice.value = Object.fromEntries(schedules.value.map((s) => [s.cycle, s.runs]));
}

onMounted(async () => {
  await load();
  loaded.value = true;
});

const startOf = (s: Schedule) => new Date(s.start).getTime();
const endOf = (s: Schedule) => startOf(s) + s.runs * s.period;
/** The season underway counted from 0, -1 before the start, or runs once finished. */
const seasonOf = (s: Schedule) => Math.min(Math.floor((now.value - startOf(s)) / s.period), s.runs);
const upcoming = (s: Schedule) => now.value < startOf(s);
const finished = (s: Schedule) => now.value >= endOf(s);
const current = computed(() => schedules.value.filter((s) => !finished(s)));
const past = computed(() => schedules.value.filter(finished).reverse());

function describe(s: Schedule) {
  const length = `${+(s.period / DAY).toFixed(3)}-day seasons × ${s.runs}`;
  if (upcoming(s)) return `${length} · starts ${new Date(startOf(s)).toLocaleString()}`;
  if (finished(s)) return `${length} · finished ${new Date(endOf(s)).toLocaleDateString()}`;
  return `${length} · season ${seasonOf(s) + 1} of ${s.runs}, until ${new Date(startOf(s) + (seasonOf(s) + 1) * s.period).toLocaleString()}`;
}
const leaving = (s: Schedule, g: Gallery) => g.runs < s.runs;
/** Whether g can be removed: not finished, not in the final season, not already leaving, and not the last one staying. */
function removable(s: Schedule, g: Gallery) {
  if (finished(s) || leaving(s, g) || seasonOf(s) >= s.runs - 1) return false;
  return s.galleries.filter((x) => !leaving(s, x)).length > 1;
}

async function act(at: string, endpoint: Parameters<typeof explain>[0], call: Promise<object>, ties = {}) {
  confirming.value = null;
  const result = await call;
  problem.value = "error" in result ? { at, message: explain(endpoint, String(result.error), ties) } : null;
  await load();
}

const setRuns = (s: Schedule) => {
  const runs = runsChoice.value[s.cycle] ?? s.runs;
  // Below the season underway is refused; say so instead of the overlap message.
  const tooFew = !upcoming(s) && runs < seasonOf(s) + 1;
  return act(s.cycle, "/admin/schedules/set-runs", client.admin.schedules["set-runs"]({ cycle: s.cycle, runs }), {
    CONFLICT: tooFew ? "it can't end before the season underway finishes." : undefined,
  });
};
const removeGallery = (s: Schedule, g: Gallery) =>
  act(`${s.cycle}|${g.group}`, "/admin/schedules/remove-gallery", client.admin.schedules["remove-gallery"]({ cycle: s.cycle, group: g.group }));
function edit(s: Schedule | null) {
  editing.value = s?.cycle ?? null;
  adding.value = [];
  confirming.value = null;
  problem.value = null;
  runsChoice.value = Object.fromEntries(schedules.value.map((x) => [x.cycle, x.runs]));
}

async function addGalleries(s: Schedule) {
  const at = `${s.cycle}|add`;
  const say = (message: string) => void (problem.value = { at, message });
  // The checks the page can make itself, as when creating a schedule.
  if (!adding.value.length) return say("add at least one gallery.");
  if (adding.value.some((g) => !g.name.trim())) return say("every gallery needs a name.");
  const repeated = repeatedName([...s.galleries, ...adding.value].map((g) => g.name));
  if (repeated) return say(`two galleries are named "${repeated}".`);
  const result = await client.admin.schedules["add-galleries"]({
    cycle: s.cycle,
    names: adding.value.map((g) => g.name.trim()),
    nominations: adding.value.flatMap((g) => (g.nomination ? [g.nomination] : [])),
  });
  if ("error" in result) {
    say(explain("/admin/schedules/add-galleries", result.error));
    if (result.error === "NOT_FOUND") await picker.value[0]?.reload();
    return;
  }
  adding.value = [];
  problem.value = null;
  await load();
}
const cancel = (s: Schedule) => act(s.cycle, "/admin/schedules/cancel", client.admin.schedules.cancel({ cycle: s.cycle }));
</script>

<template>
  <h2>Schedules</h2>
  <p v-if="made" class="season-notice">scheduled {{ made }} {{ made === "1" ? "gallery" : "galleries" }}.</p>
  <p v-if="problem?.at === 'page'"><ErrorNote :problem="problem" at="page" /></p>
  <p v-if="loaded && !schedules.length && problem?.at !== 'page'">
    nothing is scheduled yet. <RouterLink to="/home/admin/new">make a new schedule</RouterLink>.
  </p>

  <article v-for="s in current" :key="s.cycle" class="schedule" :class="{ editing: editing === s.cycle }">
    <h3>
      {{ s.period >= WING_MIN_PERIOD ? "Wings" : "Galleries" }}
      <span class="meta">{{ upcoming(s) ? "upcoming" : "running" }}</span>
      <button v-if="editing !== s.cycle" @click="edit(s)">edit</button>
      <button v-else @click="edit(null)">done</button>
    </h3>
    <p class="meta">{{ describe(s) }}</p>
    <ul class="rows">
      <li v-for="g in s.galleries" :key="g.group">
        <RouterLink :to="`/galleries/${g.group}`">{{ g.name }}</RouterLink>
        <span v-if="leaving(s, g)" class="meta"> · leaves after season {{ g.runs }}</span>
        <template v-if="editing === s.cycle && removable(s, g)">
          <button v-if="confirming !== `${s.cycle}|${g.group}`" @click="confirming = `${s.cycle}|${g.group}`">remove</button>
          <template v-else>
            {{ upcoming(s) ? `remove ${g.name}? it will be deleted.` : `remove ${g.name}? it stays this season and leaves after it.` }}
            <button @click="removeGallery(s, g)">yes, remove</button>
            <button @click="confirming = null">no</button>
          </template>
        </template>
        <ErrorNote :problem="problem" :at="`${s.cycle}|${g.group}`" />
      </li>
    </ul>

    <template v-if="editing === s.cycle">
      <form v-if="upcoming(s)" class="schedule-form" @submit.prevent="addGalleries(s)">
        <h4>Add {{ s.period >= WING_MIN_PERIOD ? "wings" : "galleries" }}</h4>
        <GalleryPicker ref="picker" v-model="adding" />
        <p>
          <button type="submit" :disabled="!adding.length">add to schedule</button>
          <ErrorNote :problem="problem" :at="`${s.cycle}|add`" />
        </p>
      </form>
      <p>
        <label>
          number of seasons
          <input v-model.number="runsChoice[s.cycle]" type="number" step="1" :min="upcoming(s) ? 1 : seasonOf(s) + 1" />
        </label>
        <button :disabled="runsChoice[s.cycle] === s.runs" @click="setRuns(s)">save</button>
        <template v-if="upcoming(s)">
          <button v-if="confirming !== s.cycle" @click="confirming = s.cycle">cancel schedule</button>
          <template v-else>
            cancel this schedule and delete its galleries?
            <button @click="cancel(s)">yes, cancel it</button>
            <button @click="confirming = null">no</button>
          </template>
        </template>
        <ErrorNote :problem="problem" :at="s.cycle" />
      </p>
    </template>
  </article>

  <details v-if="past.length" class="past-schedules">
    <summary>finished schedules ({{ past.length }})</summary>
    <article v-for="s in past" :key="s.cycle" class="schedule">
      <p class="meta">{{ describe(s) }}</p>
      <p>
        <template v-for="(g, i) in s.galleries" :key="g.group">
          <template v-if="i">, </template>
          <RouterLink :to="`/archive/${g.group}`">{{ g.name }}</RouterLink>
        </template>
      </p>
    </article>
  </details>
</template>
