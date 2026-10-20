<script setup lang="ts">
import { onMounted, ref } from "vue";
import { client } from "../api.ts";

type Nomination = Extract<Awaited<ReturnType<typeof client.nominations.mine>>, { mine: unknown }>["mine"]["nominations"][number];

const nominations = ref<Nomination[]>([]);
const confirming = ref<string | null>(null); // the nomination waiting for "yes, withdraw"
const loaded = ref(false);
const error = ref("");

onMounted(async () => {
  const result = await client.nominations.mine({});
  if ("error" in result) error.value = result.error;
  else nominations.value = result.mine.nominations;
  loaded.value = true;
});

async function withdraw(nomination: string) {
  confirming.value = null;
  const result = await client.nominations.withdraw({ nomination });
  if ("error" in result) error.value = result.error;
  else nominations.value = nominations.value.filter((n) => n.nomination !== nomination);
}
</script>

<template>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="loaded && !nominations.length && !error">
    you haven't nominated anything yet. <RouterLink to="/nominations">nominate a future gallery</RouterLink>.
  </p>
  <ul class="rows">
    <li v-for="n in nominations" :key="n.nomination">
      {{ n.name }} · {{ n.votes }} vote(s) · {{ new Date(n.createdAt).toLocaleDateString() }}
      <template v-if="n.current"> · <strong>this round</strong></template>
      <button v-if="confirming !== n.nomination" @click="confirming = n.nomination">withdraw</button>
      <template v-else>
        withdraw it?
        <button @click="withdraw(n.nomination)">yes, withdraw</button>
        <button @click="confirming = null">no</button>
      </template>
    </li>
  </ul>
</template>
