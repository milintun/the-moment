<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { FUTURE_GALLERIES, client } from "../../api.ts";
import { explain } from "../../errors.ts";
import ErrorNote from "../ErrorNote.vue";

// The galleries to make for a schedule: typed, or picked from finished nomination rounds,
// last week's first. Shared by a new schedule and adding to one that hasn't started.

export type PickedGallery = { name: string; nomination?: string };
type Nomination = Extract<
  Awaited<ReturnType<typeof client.admin.nominations.round>>,
  { ranking: unknown }
>["ranking"]["nominations"][number];

const WEEK = 7 * 24 * 60 * 60 * 1000;
const galleries = defineModel<PickedGallery[]>({ required: true });
const newName = ref("");

function addGallery() {
  if (newName.value.trim()) galleries.value.push({ name: newName.value.trim() });
  newName.value = "";
}

let category = "";
let currentRound: number | null = null;
let currentStart = 0;
const round = ref<number | null>(null); // the round on show; the newest finished one first
const ranking = ref<Nomination[]>([]);
const rankingError = ref("");
const newestFinished = computed(() => (currentRound == null ? null : currentRound - 1));
const roundStart = (r: number) => new Date(currentStart - (currentRound! - r) * WEEK);

async function showRound(r: number) {
  round.value = r;
  const result = await client.admin.nominations.round({ category, round: r });
  if ("error" in result) {
    ranking.value = [];
    rankingError.value = explain("/admin/nominations/round", result.error);
  } else {
    ranking.value = result.ranking.nominations;
    rankingError.value = "";
  }
}

onMounted(async () => {
  const categories = await client.nominations.categories({});
  if ("error" in categories) return void (rankingError.value = explain("/nominations/categories", categories.error));
  const found = categories.list.categories.find((c) => c.name === FUTURE_GALLERIES);
  if (!found || found.run == null) return;
  category = found.category;
  currentRound = found.run;
  currentStart = new Date(found.runStart!).getTime();
  if (newestFinished.value != null && newestFinished.value >= 0) await showRound(newestFinished.value);
});

const picked = (n: Nomination) => galleries.value.some((g) => g.nomination === n.nomination);
function togglePick(n: Nomination) {
  if (picked(n)) galleries.value = galleries.value.filter((g) => g.nomination !== n.nomination);
  else galleries.value.push({ name: n.name, nomination: n.nomination });
}

/** Reads the round on show again, after a picked nomination turned out to be unavailable. */
defineExpose({ reload: () => (round.value == null ? undefined : showRound(round.value)) });
</script>

<template>
  <p v-if="!galleries.length" class="meta">none yet. type a name, or pick ideas from a nomination round below.</p>
  <ul class="rows">
    <li v-for="(g, i) in galleries" :key="i">
      <input v-model="g.name" :aria-label="`gallery ${i + 1} name`" />
      <span v-if="g.nomination" class="meta"> from nominations</span>
      <button type="button" @click="galleries.splice(i, 1)">remove</button>
    </li>
  </ul>
  <p>
    <label>name <input v-model="newName" @keydown.enter.prevent="addGallery" /></label>
    <button type="button" @click="addGallery">add gallery</button>
  </p>

  <h4>From nominations</h4>
  <p v-if="rankingError"><ErrorNote :problem="rankingError" /></p>
  <p v-else-if="round == null" class="meta">no nomination round has finished yet.</p>
  <template v-else>
    <p class="round-nav">
      <button type="button" :disabled="round <= 0" aria-label="older round" @click="showRound(round - 1)">←</button>
      week of {{ roundStart(round).toLocaleDateString() }}
      <template v-if="round === newestFinished"> (last week)</template>
      <button type="button" :disabled="round >= newestFinished!" aria-label="newer round" @click="showRound(round + 1)">→</button>
    </p>
    <p v-if="!ranking.length" class="meta">nobody nominated anything that week.</p>
    <ol class="rows">
      <li v-for="n in ranking" :key="n.nomination" :class="{ chosen: n.chosen }">
        <label>
          <input type="checkbox" :checked="picked(n)" :disabled="n.chosen" @change="togglePick(n)" />
          {{ n.name }}
        </label>
        <span class="meta"> by {{ n.nominator }} · {{ n.votes }} vote(s)<template v-if="n.chosen"> · already chosen</template></span>
      </li>
    </ol>
  </template>
</template>
