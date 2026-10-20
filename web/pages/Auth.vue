<script setup lang="ts">
import AuthForm from "../components/AuthForm.vue";
import { me } from "../api.ts";
</script>

<template>
  <h1>Register or log in</h1>
  <p v-if="me">you're logged in as {{ me }}. <RouterLink to="/home">go home</RouterLink>.</p>
  <AuthForm v-else next="/home" />
</template>
