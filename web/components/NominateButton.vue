<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { client, normalizeName } from "../api.ts";
import { explain } from "../errors.ts";
import ErrorNote from "./ErrorNote.vue";

// NOMINATE + and the small form it opens just below it, for an idea in `category`. Esc or a
// click elsewhere closes it, and so does an idea that goes through (`nominated`).
// `label` is the button's text ("nominate +" unless given); a bare "+" is named for screen readers.
const props = withDefaults(defineProps<{ category: string; label?: string }>(), { label: "nominate +" });
const emit = defineEmits<{ nominated: [] }>();

const open = ref(false);
const name = ref("");
const error = ref("");
const root = ref<HTMLElement>();
const input = ref<HTMLInputElement>();
watch(open, async (now) => {
  if (!now) return;
  error.value = "";
  await nextTick();
  input.value?.focus();
});
const outside = (e: PointerEvent) => !root.value?.contains(e.target as Node) && (open.value = false);
onMounted(() => document.addEventListener("pointerdown", outside));
onBeforeUnmount(() => document.removeEventListener("pointerdown", outside));

/** The idea already up this round that matches what was typed, if any. */
async function alreadyUp() {
  const list = await client.nominations.list({ category: props.category });
  return "error" in list ? undefined : list.ranking.nominations.find((n) => normalizeName(n.name) === normalizeName(name.value));
}
const upMessage = (idea: string) => `"${idea}" is already nominated. upvote it instead.`;

async function submit() {
  error.value = "";
  // Already up, round closed, and once a day are all CONFLICT; check what can be checked first.
  const up = await alreadyUp();
  if (up) return void (error.value = upMessage(up.name));
  const result = await client.nominations.create({ category: props.category, name: name.value });
  if ("error" in result) {
    const categories = await client.nominations.categories({});
    const found = "error" in categories ? undefined : categories.list.categories.find((c) => c.category === props.category);
    const closed = !found?.runEnd || new Date(found.runEnd).getTime() <= Date.now();
    const raced = await alreadyUp();
    const CONFLICT = closed ? "this round is over, so it isn't taking nominations." : raced ? upMessage(raced.name) : undefined;
    error.value = explain("/nominations/create", result.error, { CONFLICT });
    return;
  }
  name.value = "";
  open.value = false;
  emit("nominated");
}
</script>

<template>
  <div ref="root" class="nominate" @keydown.esc="open = false">
    <button type="button" class="accent-button" :aria-expanded="open" :aria-label="label === '+' ? 'nominate an idea' : undefined" @click="open = !open">{{ label }}</button>
    <form v-if="open" class="nominate-form" @submit.prevent="submit">
      <label>your idea <input ref="input" v-model="name" required maxlength="40" /></label>
      <button type="submit">submit</button> (one per day)
      <ErrorNote :problem="error" />
    </form>
  </div>
</template>

<style scoped>
.nominate {
  position: relative;
}
/* The small form, just below NOMINATE +, over what's under it. */
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
</style>
