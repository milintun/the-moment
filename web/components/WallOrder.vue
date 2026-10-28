<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { WallSort } from "../api.ts";

// "sorted by [votes ⌄]": the art wall's order, as a small menu of its own rather than the
// browser's select. It works like one: click or Enter/Space opens it, ↑/↓ pick, Enter chooses,
// Esc, Tab, or a click elsewhere closes it. While open, focus is on the option the keyboard is
// on, so screen readers announce each one.
const order = defineModel<WallSort>({ required: true });
const OPTIONS: WallSort[] = ["votes", "newest", "oldest"];

const open = ref(false);
const active = ref(0); // the option the keyboard is on while open
const root = ref<HTMLElement>();
const button = ref<HTMLButtonElement>();
const items = ref<HTMLElement[]>([]);
watch([open, active], async () => {
  if (!open.value) return;
  await nextTick();
  items.value[active.value]?.focus();
});

function toggle() {
  open.value = !open.value;
  active.value = OPTIONS.indexOf(order.value);
}
function choose(o: WallSort) {
  order.value = o;
  open.value = false;
  button.value?.focus();
}
function key(e: KeyboardEvent) {
  const keys = ["ArrowDown", "ArrowUp", "Escape", "Enter", " "];
  if (!keys.includes(e.key) || (!open.value && (e.key === "Escape" || e.key === "Enter" || e.key === " "))) return;
  e.preventDefault();
  if (!open.value) return toggle(); // an arrow opens it
  if (e.key === "Escape") {
    open.value = false;
    button.value?.focus();
  }
  else if (e.key === "ArrowDown") active.value = Math.min(active.value + 1, OPTIONS.length - 1);
  else if (e.key === "ArrowUp") active.value = Math.max(active.value - 1, 0);
  else choose(OPTIONS[active.value]!);
}
const outside = (e: PointerEvent) => !root.value?.contains(e.target as Node) && (open.value = false);
/** Focus leaving the menu (Tab, say) closes it. */
const left = (e: FocusEvent) => !root.value?.contains(e.relatedTarget as Node) && (open.value = false);
onMounted(() => document.addEventListener("pointerdown", outside));
onBeforeUnmount(() => document.removeEventListener("pointerdown", outside));
</script>

<template>
  <span ref="root" class="wall-order" @keydown="key" @focusout="left">
    sorted by
    <button
      ref="button"
      type="button"
      class="current"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="`sorted by ${order}`"
      @click="toggle"
    >
      {{ order }}
      <svg class="chevron" viewBox="0 0 10 6" aria-hidden="true"><polyline points="1 1 5 5 9 1" /></svg>
    </button>
    <ul v-if="open" class="options" role="listbox" aria-label="sort the wall by">
      <li
        v-for="(o, i) in OPTIONS"
        :key="o"
        ref="items"
        tabindex="-1"
        role="option"
        :aria-selected="o === order"
        :class="{ active: i === active, chosen: o === order }"
        @click="choose(o)"
        @pointerenter="active = i"
      >
        {{ o }}
      </li>
    </ul>
  </span>
</template>

<style scoped>
.wall-order {
  position: relative;
  display: inline-block;
}
.current {
  margin: 0 0 0 0.3em;
  padding: 0.05em 0.4em;
}
.current:hover:not(:disabled) {
  background: var(--paper); /* the menu, not a button that does something */
  color: var(--accent);
  border-color: var(--accent);
}
.chevron {
  width: 0.6em;
  height: 0.4em;
  margin-left: 0.25em;
  vertical-align: middle;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.15s;
}
[aria-expanded="true"] .chevron {
  transform: rotate(180deg);
}
.options {
  position: absolute;
  z-index: 5;
  top: calc(100% + 2px);
  right: 0;
  min-width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  border: var(--line);
  background: var(--paper);
}
.options li {
  padding: 0.2em 0.6em;
  cursor: pointer;
}
.options li:focus {
  outline: none; /* the accent colour shows which one */
}
.options li.active {
  color: var(--accent);
}
.options li.chosen {
  text-decoration: underline;
  text-underline-offset: 0.18em;
}
</style>
