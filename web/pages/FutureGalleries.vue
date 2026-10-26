<script setup lang="ts">
import { onMounted, ref } from "vue";
import ErrorNote from "../components/ErrorNote.vue";
import { FUTURE_GALLERIES, client, me, normalizeName, span, useNow } from "../api.ts";
import { explain, type Problem } from "../errors.ts";

type Nomination = Extract<Awaited<ReturnType<typeof client.nominations.list>>, { ranking: unknown }>["ranking"]["nominations"][number];

let category = ""; // the Future galleries category, found by name
const roundEnd = ref<string | null>(null); // null when the category is closed
const ranking = ref<Nomination[]>([]);
const voted = ref(new Set<string>());
const newName = ref("");
const confirming = ref<string | null>(null); // the nomination waiting for "Yes, withdraw"
const message = ref("");
const problem = ref<Problem | null>(null); // at "page", "form", or a nomination
const now = useNow();
const ROUND_OVER = "this round is over, so its votes are final.";
const roundOver = () => !roundEnd.value || new Date(roundEnd.value).getTime() <= Date.now();
const loaded = ref(false); // render the round once the first load is done, so nothing flashes

async function load() {
  const categories = await client.nominations.categories({});
  if ("error" in categories) return void (problem.value = { at: "page", message: explain("/nominations/categories", categories.error) });
  const found = categories.list.categories.find((c) => c.name === FUTURE_GALLERIES);
  if (!found) return void (problem.value = { at: "page", message: "nominations aren't set up yet." });
  category = found.category;
  roundEnd.value = found.runEnd ?? null;
  const list = await client.nominations.list({ category });
  if ("error" in list) return void (problem.value = { at: "page", message: explain("/nominations/list", list.error) });
  ranking.value = list.ranking.nominations;
  if (me.value) {
    const mine = await client.nominations["my-votes"]({ category });
    voted.value = new Set("error" in mine ? [] : mine.votes.nominations.map((n) => n.nomination));
  }
}

const alreadyNominated = () => ranking.value.find((n) => normalizeName(n.name) === normalizeName(newName.value));
const nominatedMessage = (name: string) => `"${name}" is already nominated. upvote it instead.`;

async function nominate() {
  problem.value = null;
  message.value = "";
  // Already nominated, round closed, and once a day are all CONFLICT; check what the page knows first.
  const existing = alreadyNominated();
  if (existing) return void (problem.value = { at: "form", message: nominatedMessage(existing.name) });
  const result = await client.nominations.create({ category, name: newName.value });
  if ("error" in result) {
    await load();
    const nominated = alreadyNominated();
    const CONFLICT = roundOver() ? "this round is over, so it isn't taking nominations." : nominated ? nominatedMessage(nominated.name) : undefined;
    problem.value = { at: "form", message: explain("/nominations/create", result.error, { CONFLICT }) };
    return;
  }
  newName.value = "";
  message.value = "nominated.";
  await load();
}

async function toggle(nomination: string) {
  problem.value = null;
  const unvoting = voted.value.has(nomination);
  const result = unvoting ? await client.nominations.unvote({ nomination }) : await client.nominations.vote({ nomination });
  await load();
  if (!("error" in result)) return;
  const gone = !ranking.value.some((n) => n.nomination === nomination);
  problem.value = {
    at: gone ? "page" : nomination, // a withdrawn nomination has no row left to show it
    message: unvoting
      ? explain("/nominations/unvote", result.error, { NOT_FOUND: gone ? "this nomination was withdrawn." : undefined })
      : explain("/nominations/vote", result.error, { CONFLICT: roundOver() ? ROUND_OVER : undefined }),
  };
}

async function withdraw(nomination: string) {
  confirming.value = null;
  problem.value = null;
  const result = await client.nominations.withdraw({ nomination });
  await load();
  if ("error" in result) problem.value = { at: "page", message: explain("/nominations/withdraw", result.error) };
}

onMounted(async () => {
  await load();
  loaded.value = true;
});
</script>

<template>
  <h1>Future galleries</h1>
  <p>
    Name the galleries you want to see next. Each round lasts one season, and the most upvoted
    ideas help decide the next galleries.
  </p>
  <template v-if="loaded">
  <p v-if="!roundEnd">nominations are closed right now.</p>
  <template v-else>
    <p>this round is open until {{ new Date(roundEnd).toLocaleString() }}.</p>
    <p class="season-notice">
      {{ new Date(roundEnd).getTime() > now ? `nominations close in ${span(new Date(roundEnd).getTime() - now)}` : "this round just closed." }}
    </p>
  </template>

  <template v-if="roundEnd">
    <form v-if="me" @submit.prevent="nominate">
      <label>Your idea <input v-model="newName" required maxlength="100" /></label>
      <button type="submit">Nominate</button> (once a day)
      <ErrorNote :problem="problem" at="form" />
    </form>
    <p v-else><RouterLink to="/auth">log in to nominate and vote</RouterLink></p>
  </template>
  <p v-if="message">{{ message }}</p>
  <p v-if="problem?.at === 'page'"><ErrorNote :problem="problem" at="page" /></p>

  <h2>This round</h2>
  <p v-if="!ranking.length">No nominations yet.</p>
  <ol>
    <li v-for="n in ranking" :key="n.nomination">
      {{ n.name }} by {{ n.nominator }} | {{ n.votes }} vote(s)
      <button v-if="me && me !== n.nominator" :class="{ voted: voted.has(n.nomination) }" @click="toggle(n.nomination)">
        {{ voted.has(n.nomination) ? "Unvote" : "Upvote" }}
      </button>
      <template v-if="me === n.nominator">
        <button v-if="confirming !== n.nomination" @click="confirming = n.nomination">Withdraw</button>
        <template v-else>
          Withdraw this nomination?
          <button @click="withdraw(n.nomination)">Yes, withdraw</button>
          <button @click="confirming = null">No</button>
        </template>
      </template>
      <ErrorNote :problem="problem" :at="n.nomination" />
    </li>
  </ol>
  </template>
</template>
