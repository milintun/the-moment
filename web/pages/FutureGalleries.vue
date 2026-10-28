<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ErrorNote from "../components/ErrorNote.vue";
import { FUTURE_GALLERIES, client, dayAndHour, me, normalizeName, span, useNow } from "../api.ts";
import { explain, type Problem } from "../errors.ts";

type Nomination = Extract<Awaited<ReturnType<typeof client.nominations.list>>, { ranking: unknown }>["ranking"]["nominations"][number];

let category = ""; // the Future galleries category, found by name
const roundStart = ref<string | null>(null);
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
  roundStart.value = found.runStart ?? null;
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
  formOpen.value = false;
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

/** A date and time, short: "10/26/2026, 1:00 AM". */
const when = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" });

// NOMINATE + opens a small form just below it; Esc or a click elsewhere closes it.
const formOpen = ref(false);
const nominating = ref<HTMLElement>();
const ideaInput = ref<HTMLInputElement>();
watch(formOpen, async (open) => {
  if (!open) return;
  message.value = "";
  await nextTick();
  ideaInput.value?.focus();
});
const outside = (e: PointerEvent) => !nominating.value?.contains(e.target as Node) && (formOpen.value = false);
onMounted(() => document.addEventListener("pointerdown", outside));
onBeforeUnmount(() => document.removeEventListener("pointerdown", outside));

/** Someone else's idea, which a signed-in visitor votes on by clicking its row. */
const canVote = (n: Nomination) => !!me.value && me.value !== n.nominator;
/** Your own idea, not yet chosen, which you withdraw by clicking its row (then confirming). */
const canWithdraw = (n: Nomination) => me.value === n.nominator && !n.chosen;
function rowClick(n: Nomination) {
  if (canVote(n)) toggle(n.nomination);
  else if (canWithdraw(n) && confirming.value !== n.nomination) confirming.value = n.nomination;
}

onMounted(async () => {
  await load();
  loaded.value = true;
});
</script>

<template>
  <h1>Future galleries</h1>
  <p>
    nominate and upvote gallery ideas you want to see next. Each round lasts a week, and nominations reset every
    Monday at 12 AM EST. The most upvoted ideas will decide the next galleries.
  </p>
  <template v-if="loaded">
  <p v-if="roundEnd && !me"><RouterLink to="/auth">log in to nominate and vote</RouterLink></p>
  <p v-if="message">{{ message }}</p>
  <p v-if="problem?.at === 'page'"><ErrorNote :problem="problem" at="page" /></p>

  <!-- The round's heading is its countdown; signed in, NOMINATE + sits across from it. -->
  <div class="round-bar">
    <h2 v-if="!roundEnd" class="round">nominations are closed right now.</h2>
    <h2 v-else class="round">
      {{ new Date(roundEnd).getTime() > now ? `current round closes in ${span(new Date(roundEnd).getTime() - now)}` : "this round just closed" }}
      <template v-if="roundStart">({{ dayAndHour(roundStart) }} – {{ dayAndHour(roundEnd) }})</template>
    </h2>
    <div v-if="roundEnd && me" ref="nominating" class="nominate" @keydown.esc="formOpen = false">
      <button type="button" class="accent-button" :aria-expanded="formOpen" @click="formOpen = !formOpen">nominate +</button>
      <form v-if="formOpen" class="nominate-form" @submit.prevent="nominate">
        <label>Your idea <input ref="ideaInput" v-model="newName" required maxlength="40" /></label>
        <button type="submit">submit</button> (one per day)
        <ErrorNote :problem="problem" at="form" />
      </form>
    </div>
  </div>
  <p v-if="!ranking.length">No nominations yet.</p>
  <table v-if="ranking.length" class="ranking">
    <thead>
      <tr>
        <th scope="col">nominations</th>
        <th scope="col">votes</th>
        <th scope="col">by</th>
        <th scope="col">added</th>
        <th scope="col"><span class="hidden">actions</span></th>
      </tr>
    </thead>
    <tbody>
      <!-- Signed in, someone else's idea is voted on by clicking its row (or its UPVOTE, from the keyboard). -->
      <tr
        v-for="n in ranking"
        :key="n.nomination"
        :class="{ votable: canVote(n) || (canWithdraw(n) && confirming !== n.nomination), own: me === n.nominator }"
        @click="rowClick(n)"
      >
        <td>
          <span :class="{ chosen: n.chosen }">{{ n.name }}</span>
          <template v-if="n.chosen"> · chosen to become a gallery</template>
        </td>
        <td :class="{ mine: voted.has(n.nomination) }">{{ n.votes }}</td>
        <td>{{ n.nominator }}</td>
        <td>{{ when(n.createdAt) }}</td>
        <td class="actions">
          <button
            v-if="canVote(n)"
            type="button"
            class="vote-label"
            :aria-pressed="voted.has(n.nomination)"
            :aria-label="`${voted.has(n.nomination) ? 'take back your vote for' : 'upvote'} ${n.name}`"
            @click.stop="toggle(n.nomination)"
          >
            {{ voted.has(n.nomination) ? "unvote" : "upvote" }}
          </button>
          <template v-if="canWithdraw(n)">
            <button
              v-if="confirming !== n.nomination"
              type="button"
              class="vote-label withdraw-label"
              :aria-label="`withdraw ${n.name}`"
              @click.stop="confirming = n.nomination"
            >
              withdraw
            </button>
            <template v-else>
              Withdraw this nomination?
              <button @click.stop="withdraw(n.nomination)">Yes, withdraw</button>
              <button @click.stop="confirming = null">No</button>
            </template>
          </template>
          <ErrorNote :problem="problem" :at="n.nomination" />
        </td>
      </tr>
    </tbody>
  </table>
  </template>
</template>

<style scoped>
/* The round's countdown (plain text, no rule under it) and NOMINATE + across from it. */
.round-bar {
  clear: right; /* below the mini map, so NOMINATE + lines up with the table's right edge */
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 3em 0 1.2em;
}
.round {
  margin: 0;
  padding: 0;
  border: 0;
}
/* The small nominating form, just below NOMINATE +, over the table. */
.nominate {
  position: relative;
  top: 0.5rem; /* a little below the countdown's line */
  margin-left: auto;
}
.nominate-form {
  position: absolute;
  z-index: 5;
  top: calc(100% + 6px);
  right: 0;
  width: max-content;
  max-width: calc(100vw - 2 * var(--gutter));
  padding: 0.8rem;
  border: var(--line);
  background: var(--paper);
}
.nominate-form input {
  margin-left: 0.6em;
}
.nominate-form input:focus,
.nominate-form input:focus-visible {
  outline: none; /* no ring while typing */
}
.nominate-form button {
  margin: 0 0.3em 0 0;
}
.ranking {
  width: 100%;
  border-collapse: collapse;
}
.ranking th,
.ranking td {
  text-align: left;
  vertical-align: baseline;
  padding: 0.45em 1em 0.45em 0;
  border-bottom: var(--line);
}
.ranking th {
  font-weight: 400;
  text-transform: uppercase;
}
.ranking th:first-child,
.ranking td:first-child {
  padding-left: 0.6rem; /* so a filled row's text doesn't touch its edge */
}
.ranking td:last-child {
  padding-right: 0.8rem;
  text-align: right;
}
/* Someone else's idea, signed in: pointing at its row washes it in the accent colour and shows
   UPVOTE (or UNVOTE) at its right end; your votes show as their count in the accent colour. */
.ranking tr.votable {
  cursor: pointer;
}
.ranking tr.votable:hover td,
.ranking tr.votable:focus-within td {
  background: color-mix(in srgb, var(--accent) 18%, var(--paper));
}
.ranking .mine {
  color: var(--accent);
}
.vote-label {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0;
}
.vote-label:hover:not(:disabled) {
  background: none;
  color: var(--accent);
}
/* Your own ideas: black rows with white text. Pointing at one washes it in the accent colour
   too, and says WITHDRAW instead. */
.ranking tr.own td {
  background: var(--ink);
  color: var(--paper);
}
.ranking tr.own.votable:hover td,
.ranking tr.own.votable:focus-within td {
  background: color-mix(in srgb, var(--accent) 35%, var(--ink));
}
.withdraw-label,
.withdraw-label:hover:not(:disabled) {
  color: var(--paper);
}
.ranking tr.votable:hover .vote-label,
.vote-label:focus-visible {
  opacity: 1;
}
/* Named for screen readers, but nothing to show sighted readers above the buttons. */
.hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
