<script setup>
import { icons } from './icons.mjs';
defineProps({ name: String });
</script>
<template>
  <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="icons[name] ?? icons.other" />
</template>
