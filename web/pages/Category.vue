<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { client, me, normalizeName } from "../api.ts";

type Nomination = Extract<Awaited<ReturnType<typeof client.nominations.list>>, { ranking: unknown }>["ranking"]["nominations"][number];

const category = useRoute().params.id as string;
const name = ref("");
const roundEnd = ref<string | null>(null); // null when the category is closed
const ranking = ref<Nomination[]>([]);
const voted = ref(new Set<string>());
const newName = ref("");
const confirming = ref<string | null>(null); // the nomination waiting for "Yes, withdraw"
const message = ref("");
const error = ref("");

async function load() {
  const [categories, list] = await Promise.all([client.nominations.categories({}), client.nominations.list({ category })]);
  if ("error" in categories) return void (error.value = categories.error);
  if ("error" in list) return void (error.value = list.error);
  const found = categories.list.categories.find((c) => c.category === category);
  name.value = found?.name ?? "Unknown category";
  roundEnd.value = found?.runEnd ?? null;
  ranking.value = list.ranking.nominations;
  if (me.value) {
    const mine = await client.nominations["my-votes"]({ category });
    voted.value = new Set("error" in mine ? [] : mine.votes.nominations.map((n) => n.nomination));
  }
}

async function nominate() {
  error.value = "";
  message.value = "";
  // Catch the common refusals here, since the server only answers "CONFLICT" for them.
  const existing = ranking.value.find((n) => normalizeName(n.name) === normalizeName(newName.value));
  if (existing) return void (error.value = `"${existing.name}" is already nominated; upvote it instead.`);
  const result = await client.nominations.create({ category, name: newName.value });
  if ("error" in result) {
    error.value =
      result.error === "CONFLICT" ? "You can nominate once a day." :
      result.error === "INVALID_REQUEST" ? "Enter a name for your idea." : result.error;
    return;
  }
  newName.value = "";
  message.value = "Nominated.";
  await load();
}

async function toggle(nomination: string) {
  const result = voted.value.has(nomination)
    ? await client.nominations.unvote({ nomination })
    : await client.nominations.vote({ nomination });
  error.value = "error" in result ? result.error : "";
  await load();
}

async function withdraw(nomination: string) {
  confirming.value = null;
  const result = await client.nominations.withdraw({ nomination });
  error.value = "error" in result ? result.error : "";
  await load();
}

onMounted(load);
</script>

<template>
  <h1>{{ name }}</h1>
  <p>{{ roundEnd ? `Round open until ${new Date(roundEnd).toLocaleString()}` : "Closed: no round is open right now." }}</p>

  <template v-if="roundEnd">
    <form v-if="me" @submit.prevent="nominate">
      <label>Your idea <input v-model="newName" required maxlength="100" /></label>
      <button type="submit">Nominate</button> (once a day)
    </form>
    <p v-else><RouterLink to="/login">Log in to nominate and vote</RouterLink></p>
  </template>
  <p v-if="message">{{ message }}</p>
  <p v-if="error">Error: {{ error }}</p>

  <h2>This round</h2>
  <p v-if="!ranking.length">No nominations yet.</p>
  <ol>
    <li v-for="n in ranking" :key="n.nomination">
      {{ n.name }} by {{ n.nominator }} | {{ n.votes }} vote(s)
      <button v-if="me && me !== n.nominator" @click="toggle(n.nomination)">
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
    </li>
  </ol>
  <p><RouterLink to="/nominations">All categories</RouterLink></p>
</template>
