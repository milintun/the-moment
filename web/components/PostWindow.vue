<script setup lang="ts">
import { ref } from "vue";
import PostForm from "./PostForm.vue";

// POST + and the window it opens over the page: the browser's own modal dialog (Esc closes it,
// focus stays inside) holding the post form, for `group` or, without one, any open gallery.
// Once posted, it closes and says which post (`posted`).
// `label` is the button's text ("post +" unless given); a bare "+" is named by `title` for screen readers.
const props = withDefaults(defineProps<{ group?: string; title: string; label?: string }>(), { label: "post +" });
const emit = defineEmits<{ posted: [post: string] }>();

const dialog = ref<HTMLDialogElement>();
const showing = ref(false); // the form is made fresh each time the window opens
function open() {
  showing.value = true;
  dialog.value?.showModal?.();
}
function close() {
  showing.value = false;
  if (dialog.value?.open) dialog.value.close();
}
function posted(post: string) {
  close();
  emit("posted", post);
}
/** A click on the dimmed page around the window (the dialog itself, outside its panel) closes it. */
const clickOutside = (e: MouseEvent) => e.target === dialog.value && close();
</script>

<template>
  <button type="button" class="post-button accent-button" aria-haspopup="dialog" :aria-label="label === '+' ? title : undefined" @click="open">{{ label }}</button>
  <dialog ref="dialog" class="post-overlay" :aria-label="title" @close="close" @click="clickOutside">
    <div class="post-panel">
      <header class="post-head">
        <h2>{{ title }}</h2>
        <button type="button" class="post-close" aria-label="close" @click="close">×</button>
      </header>
      <PostForm v-if="showing" :group="props.group" :on-posted="posted" />
    </div>
  </dialog>
</template>

<style scoped>
/* The window: the form over the dimmed page. */
.post-overlay {
  width: min(640px, calc(100vw - 2 * var(--gutter)));
  max-height: calc(100dvh - 4 * var(--gutter));
  padding: 0;
  border: var(--line);
  background: var(--paper);
  color: var(--ink);
}
.post-overlay::backdrop {
  background: rgb(0 0 0 / 0.4);
}
.post-panel {
  padding: var(--gutter);
}
.post-head {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.post-head h2 {
  margin: 0;
  padding: 0;
  border: 0;
  flex: 1;
}
.post-close {
  margin: 0;
}
/* In the window, the form, its drop zone, and its caption box fill the width. */
.post-panel :deep(.post-form),
.post-panel :deep(.dropzone) {
  max-width: none;
}
</style>
