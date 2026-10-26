<script setup lang="ts">
import { onMounted, ref } from "vue";
import { client } from "../api.ts";
import { explain, type Problem } from "../errors.ts";
import ErrorNote from "./ErrorNote.vue";

type Nomination = Extract<Awaited<ReturnType<typeof client.nominations.mine>>, { mine: unknown }>["mine"]["nominations"][number];

const nominations = ref<Nomination[]>([]);
const confirming = ref<string | null>(null); // the nomination waiting for "yes, withdraw"
const loaded = ref(false);
const problem = ref<Problem | null>(null); // at "list", or at an item

onMounted(async () => {
  const result = await client.nominations.mine({});
  if ("error" in result) problem.value = { at: "list", message: explain("/nominations/mine", result.error) };
  else nominations.value = result.mine.nominations;
  loaded.value = true;
});

async function withdraw(nomination: string) {
  confirming.value = null;
  const result = await client.nominations.withdraw({ nomination });
  // An item already gone leaves the list, so its message shows above the list instead.
  if ("error" in result) problem.value = { at: result.error === "NOT_FOUND" ? "list" : nomination, message: explain("/nominations/withdraw", result.error) };
  // Done, or already gone: either way it's off the list.
  if (!("error" in result) || result.error === "NOT_FOUND") nominations.value = nominations.value.filter((n) => n.nomination !== nomination);
}
</script>

<template>
  <p v-if="problem?.at === 'list'"><ErrorNote :problem="problem" at="list" /></p>
  <p v-if="loaded && !nominations.length && problem?.at !== 'list'">
    you haven't nominated anything yet. <RouterLink to="/nominations">nominate a future gallery</RouterLink>.
  </p>
  <ul class="rows">
    <li v-for="n in nominations" :key="n.nomination">
      {{ n.name }} · {{ n.votes }} vote(s) · {{ new Date(n.createdAt).toLocaleDateString() }}
      <template v-if="n.current"> · <strong>this round</strong></template>
      <template v-if="n.chosen"> · <strong>chosen to become a gallery</strong></template>
      <button v-else-if="confirming !== n.nomination" @click="confirming = n.nomination">withdraw</button>
      <template v-else>
        withdraw it?
        <button @click="withdraw(n.nomination)">yes, withdraw</button>
        <button @click="confirming = null">no</button>
      </template>
      <ErrorNote :problem="problem" :at="n.nomination" />
    </li>
  </ul>
</template>
