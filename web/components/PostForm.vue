<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { client } from "../api.ts";
import { explain } from "../errors.ts";
import { rooms, type Room } from "../museum.ts";
import ErrorNote from "./ErrorNote.vue";

// Posts an image to `group`, or, without one, to a gallery or wing picked from the open ones.
const props = defineProps<{ group?: string }>();

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_BYTES = 10 * 1024 * 1024;

const router = useRouter();
const choices = ref<Room[]>([]);
const chosen = ref(props.group ?? "");
const image = ref<File | null>(null);
const preview = ref("");
const caption = ref("");
const status = ref("");
const error = ref("");
const busy = ref(false);
const dragging = ref(false);

onMounted(async () => {
  if (!props.group) choices.value = (await rooms()).filter((r) => r.postTo);
});

const isHeic = (file: File) => /image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);

// Accepts a dropped or chosen file: converts HEIC to JPEG, then checks type and size.
async function choose(file: File | undefined) {
  error.value = "";
  if (!file) return;
  if (isHeic(file)) {
    status.value = "converting heic photo to jpeg…";
    try {
      // Loaded only when needed; the converter is large.
      const { default: loaded } = await import("heic2any");
      // A CommonJS package: Vite hands over the function itself, though TypeScript expects it under .default.
      const heic2any = loaded as unknown as typeof loaded.default;
      const jpeg = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 })) as Blob;
      file = new File([jpeg], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
    } catch {
      status.value = "";
      error.value = "couldn't convert this heic photo. try exporting it as a jpeg.";
      return;
    }
    status.value = "";
  }
  if (!ACCEPTED.includes(file.type)) return void (error.value = "only jpeg, png, webp, svg, and heic images can be posted.");
  if (file.size > MAX_BYTES) return void (error.value = "images must be 10 mb or smaller.");
  if (preview.value) URL.revokeObjectURL(preview.value);
  image.value = file;
  preview.value = URL.createObjectURL(file);
}

function onDrop(event: DragEvent) {
  dragging.value = false;
  choose(event.dataTransfer?.files[0]);
}

// Ask for an upload link, send the file straight to storage, then create the post.
async function submit() {
  if (!chosen.value) return void (error.value = "choose a gallery first.");
  if (!image.value) return void (error.value = "choose an image first.");
  busy.value = true;
  error.value = "";
  try {
    status.value = "uploading…";
    const requested = await client.uploads.request({ contentType: image.value.type });
    if ("error" in requested) throw new Error(explain("/uploads/request", requested.error));
    const sent = await fetch(requested.uploadUrl, {
      method: "PUT",
      body: image.value,
      headers: { "Content-Type": image.value.type },
    });
    if (!sent.ok) throw new Error("the image didn't upload. try again.");
    status.value = "posting…";
    const result = await client.posts.create({ group: chosen.value, content: requested.upload, caption: caption.value });
    // Its CONFLICTs are "season over" and "upload didn't arrive"; the upload just succeeded, so it's the season.
    if ("error" in result) throw new Error(explain("/posts/create", result.error));
    router.push(`/galleries/${chosen.value}#post-${result.post}`); // the gallery scrolls to the new post
  } catch (e) {
    // fetch itself throws when storage can't be reached.
    error.value = e instanceof TypeError ? explain("/uploads/request", "NETWORK_ERROR") : (e as Error).message;
    status.value = "";
  } finally {
    busy.value = false;
  }
}

onUnmounted(() => {
  if (preview.value) URL.revokeObjectURL(preview.value);
});
</script>

<template>
  <form class="post-form" @submit.prevent="submit">
    <p v-if="!group">
      <label>
        gallery
        <select v-model="chosen" required>
          <option value="" disabled>choose a gallery or wing</option>
          <option v-for="r in choices" :key="r.id" :value="r.id">{{ r.label }} ({{ r.kind }})</option>
        </select>
      </label>
      <span v-if="!choices.length"> no galleries are open right now.</span>
    </p>
    <label
      :class="['dropzone', { dragging }]"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <span v-if="!preview">drag an image here, or click to choose one: jpeg, png, webp, svg, or heic, up to 10 mb.</span>
      <img v-else :src="preview" alt="preview" />
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml,.heic,.heif"
        @change="choose(($event.target as HTMLInputElement).files?.[0])"
      />
    </label>
    <p><label>caption (optional)<textarea v-model="caption" rows="3"></textarea></label></p>
    <p><button type="submit" :disabled="busy">post</button></p>
    <p v-if="status">{{ status }}</p>
    <p v-if="error"><ErrorNote :problem="error" /></p>
  </form>
</template>

<style scoped>
.dropzone {
  display: block;
  border: 1px dashed var(--ink);
  padding: 2rem 1rem;
  margin: 0 0 1em;
  text-align: center;
  cursor: pointer;
  max-width: 560px;
}
.dropzone.dragging {
  background: var(--ink);
  color: var(--paper);
}
.dropzone img {
  max-height: 320px;
  margin: 0 auto;
}
.dropzone input[type="file"] {
  display: block;
  margin: 1em auto 0;
  border: 0;
  padding: 0;
}
.post-form {
  max-width: 560px;
}
</style>
