<script setup lang="ts">
import { onMounted, ref } from "vue";
import RoomList from "../components/RoomList.vue";
import { rooms, type Room } from "../museum.ts";

const all = ref<Room[]>([]);
const loaded = ref(false);
onMounted(async () => {
  all.value = await rooms();
  loaded.value = true;
});
</script>

<template>
  <h1>Map</h1>
  <p class="lede">walk the museum in order, or jump to any room.</p>
  <RoomList v-if="loaded" :rooms="all" />
</template>
