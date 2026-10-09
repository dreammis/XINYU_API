<script setup>
defineProps({ name: String });
</script>
<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'image'"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 16 5-5 5 5 3-3 5 5" /></template>
    <template v-else-if="name === 'video'"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m10 8 6 4-6 4Z" /></template>
    <template v-else-if="name === 'audio'"><path d="M4 10v4m4-8v12m4-15v18m4-15v12m4-8v4" /></template>
    <template v-else-if="name === 'music'"><path d="M9 18V5l11-2v13M9 9l11-2" /><ellipse cx="6" cy="18" rx="3" ry="2" /><ellipse cx="17" cy="16" rx="3" ry="2" /></template>
    <template v-else-if="name === 'text'"><path d="M4 5h16M12 5v15m-4 0h8M5 11h2m10 0h2" /></template>
    <template v-else><path d="m14 4 6 6-10 10-6-6Z" /><path d="m4 4 3 3m10 10 3 3M3 9h3m12 6h3" /></template>
  </svg>
</template>
