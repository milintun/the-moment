<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { WING_MIN_PERIOD, client, repeatedName } from "../../api.ts";
import { explain } from "../../errors.ts";
import ErrorNote from "../ErrorNote.vue";
import GalleryPicker, { type PickedGallery } from "./GalleryPicker.vue";

// A schedule and its galleries, made in one step: season length, number of seasons, start,
// and the galleries (typed, or picked from finished nomination rounds).

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/** A Date as the value of a datetime-local input, in this browser's time. */
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
/** The next 12 AM in this browser's time. */
function nextMidnight() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d;
}

const router = useRouter();
const days = ref(7);
const runs = ref(4);
const start = ref(toLocalInput(nextMidnight()));
const earliest = toLocalInput(new Date());
const galleries = ref<PickedGallery[]>([]);
const picker = ref<InstanceType<typeof GalleryPicker>>();
const error = ref("");
const busy = ref(false);

const wings = computed(() => days.value * DAY >= WING_MIN_PERIOD);
const ending = computed(() => {
  const begins = new Date(start.value).getTime();
  return Number.isNaN(begins) ? null : new Date(begins + days.value * DAY * runs.value);
});

// ---------- Creating ----------

const duplicate = () => repeatedName(galleries.value.map((g) => g.name));

async function create() {
  error.value = "";
  const begins = new Date(start.value);
  // The checks the page can make itself, so the message says exactly what's wrong.
  if (!galleries.value.length) return void (error.value = "add at least one gallery.");
  if (galleries.value.some((g) => !g.name.trim())) return void (error.value = "every gallery needs a name.");
  if (duplicate()) return void (error.value = `two galleries are named "${duplicate()}".`);
  // Starts are picked to the minute, so the current minute counts as now (the server allows the same).
  const past = () => Number.isNaN(begins.getTime()) || begins.getTime() < Date.now() - MINUTE;
  if (past()) return void (error.value = "the start can't be in the past.");
  busy.value = true;
  const result = await client.admin.schedules.create({
    period: days.value * DAY,
    runs: runs.value,
    start: begins.toISOString(),
    names: galleries.value.map((g) => g.name.trim()),
    nominations: galleries.value.flatMap((g) => (g.nomination ? [g.nomination] : [])),
  });
  busy.value = false;
  if ("error" in result) {
    error.value = explain("/admin/schedules/create", result.error, {
      INVALID_REQUEST: past() ? "the start can't be in the past." : undefined,
    });
    if (result.error === "NOT_FOUND") await picker.value?.reload();
    return;
  }
  router.push({ path: "/home/admin/schedules", query: { made: String(result.groups.length) } });
}
</script>

<template>
  <h2>New schedule</h2>
  <p class="lede">
    a schedule runs its galleries together for a number of equal seasons. galleries can only be made for a
    schedule, here or by editing one that hasn't started.
  </p>
  <form class="schedule-form" @submit.prevent="create">
    <p>
      <label>season length (days) <input v-model.number="days" type="number" min="0.001" step="any" required /></label>
      <label>number of seasons <input v-model.number="runs" type="number" min="1" step="1" required /></label>
      <label>starts <input v-model="start" type="datetime-local" :min="earliest" required /></label>
    </p>
    <p class="meta">
      <template v-if="ending">runs until {{ ending.toLocaleString() }}.</template>
      <template v-if="wings"> seasons of 30 days or more make these wings.</template>
    </p>

    <h3>{{ wings ? "Wings" : "Galleries" }}</h3>
    <GalleryPicker ref="picker" v-model="galleries" />

    <p>
      <button type="submit" :disabled="busy">create schedule</button>
      <ErrorNote :problem="error" />
    </p>
  </form>
</template>
