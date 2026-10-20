<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { client } from "../api.ts";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_BYTES = 10 * 1024 * 1024;

const group = useRoute().params.id as string;
const router = useRouter();
const image = ref<File | null>(null);
const preview = ref("");
const caption = ref("");
const status = ref("");
const error = ref("");
const busy = ref(false);

const isHeic = (file: File) => /image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);

// Accepts a dropped or chosen file: converts HEIC to JPEG, then checks type and size.
async function choose(file: File | undefined) {
  error.value = "";
  if (!file) return;
  if (isHeic(file)) {
    status.value = "Converting HEIC photo to JPEG…";
    try {
      // Loaded only when needed; the converter is large.
      const { default: heic2any } = await import("heic2any");
      const jpeg = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 })) as Blob;
      file = new File([jpeg], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
    } catch {
      status.value = "";
      error.value = "Couldn't convert this HEIC photo. Try exporting it as a JPEG.";
      return;
    }
    status.value = "";
  }
  if (!ACCEPTED.includes(file.type)) {
    error.value = "Only JPEG, PNG, WebP, SVG, and HEIC images can be posted.";
    return;
  }
  if (file.size > MAX_BYTES) {
    error.value = "Images must be 10 MB or smaller.";
    return;
  }
  if (preview.value) URL.revokeObjectURL(preview.value);
  image.value = file;
  preview.value = URL.createObjectURL(file);
}

function onDrop(event: DragEvent) {
  choose(event.dataTransfer?.files[0]);
}

function onPick(event: Event) {
  choose((event.target as HTMLInputElement).files?.[0]);
}

// Ask for an upload link, send the file straight to storage, then create the post.
async function submit() {
  if (!image.value) {
    error.value = "Choose an image first.";
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    status.value = "Uploading…";
    const requested = await client.uploads.request({ contentType: image.value.type });
    if ("error" in requested) throw new Error(requested.error);
    const sent = await fetch(requested.uploadUrl, {
      method: "PUT",
      body: image.value,
      headers: { "Content-Type": image.value.type },
    });
    if (!sent.ok) throw new Error(`upload failed (${sent.status})`);
    status.value = "Posting…";
    const result = await client.posts.create({ group, content: requested.upload, caption: caption.value });
    if ("error" in result) throw new Error(result.error);
    router.push(`/groups/${group}`);
  } catch (e) {
    error.value = (e as Error).message;
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
  <h1>New post</h1>
  <form @submit.prevent="submit">
    <fieldset @dragover.prevent @drop.prevent="onDrop">
      <legend>Image</legend>
      <p>Drag an image here, or choose one: JPEG, PNG, WebP, SVG, or HEIC, up to 10 MB.</p>
      <p><input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,.heic,.heif" @change="onPick" /></p>
      <p v-if="preview"><img :src="preview" alt="Preview" width="300" /></p>
    </fieldset>
    <p><label>Caption (optional)<br /><textarea v-model="caption" rows="3" cols="60"></textarea></label></p>
    <p><button type="submit" :disabled="busy">Post</button></p>
  </form>
  <p v-if="status">{{ status }}</p>
  <p v-if="error">Error: {{ error }}</p>
  <p><RouterLink :to="`/groups/${group}`">Back</RouterLink></p>
</template>
