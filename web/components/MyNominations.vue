<script setup lang="ts">
import { onMounted, ref } from "vue";
import { client, dateTime } from "../api.ts";
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
  <!-- Like future galleries' table, without who nominated (you did): click an idea's row to
       withdraw it (then confirm); chosen ones stay. -->
  <table v-if="nominations.length" class="ranking">
    <thead>
      <tr>
        <th scope="col">nominations</th>
        <th scope="col">votes</th>
        <th scope="col">added</th>
        <th scope="col"><span class="hidden">actions</span></th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="n in nominations"
        :key="n.nomination"
        :class="{ votable: !n.chosen && confirming !== n.nomination }"
        @click="!n.chosen && (confirming = n.nomination)"
      >
        <td>
          <span :class="{ chosen: n.chosen }">{{ n.name }}</span>
          <template v-if="n.chosen"> · chosen to become a gallery</template>
          <template v-else-if="n.current"> · this round</template>
        </td>
        <td>{{ n.votes }}</td>
        <td>{{ dateTime(n.createdAt) }}</td>
        <td>
          <template v-if="!n.chosen">
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
              withdraw it?
              <button @click.stop="withdraw(n.nomination)">yes, withdraw</button>
              <button @click.stop="confirming = null">no</button>
            </template>
          </template>
          <ErrorNote :problem="problem" :at="n.nomination" />
        </td>
      </tr>
    </tbody>
  </table>
</template>
