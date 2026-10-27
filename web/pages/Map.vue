<script setup lang="ts">
import { onMounted, ref } from "vue";
import FloorPlan from "../components/FloorPlan.vue";
import RoomList from "../components/RoomList.vue";
import { rooms, type Room } from "../museum.ts";

const all = ref<Room[]>([]);
const loaded = ref(false);
const asList = ref(false); // the same rooms as a plain list, in walking order
onMounted(async () => {
  all.value = await rooms();
  loaded.value = true;
});
</script>

<template>
  <h1>Map</h1>
  <p class="lede">
    drag to look around, scroll or pinch to zoom, and click a room to enter it.
    <button class="link-button" @click="asList = !asList">{{ asList ? "floor plan" : "list view" }}</button>
  </p>
  <template v-if="loaded">
    <RoomList v-if="asList" :rooms="all" />
    <FloorPlan v-else :rooms="all" />
  </template>
</template>
