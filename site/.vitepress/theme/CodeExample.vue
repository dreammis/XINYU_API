<script setup>
import { computed, ref } from 'vue';
const props = defineProps({ codes: Object, label: String });
const language = ref('curl');
const copied = ref(false);
const error = ref('');
const code = computed(() => props.codes[language.value]);
const languages = ['curl', 'python', 'javascript'];
function moveTab(event) {
  const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  if (!direction) return;
  event.preventDefault();
  const next = (languages.indexOf(language.value) + direction + languages.length) % languages.length;
  language.value = languages[next];
  event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();
}

async function copy() {
  try {
    await navigator.clipboard.writeText(code.value);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1800);
  } catch {
    error.value = 'Copy failed / 复制失败';
  }
}
</script>

<template>
  <div class="code-example">
    <div class="code-tabs" role="tablist" :aria-label="label || 'Code language'">
      <button v-for="(title, key) in { curl: 'cURL', python: 'Python', javascript: 'Node.js' }" :key="key" role="tab" :aria-selected="language === key" :tabindex="language === key ? 0 : -1" @keydown="moveTab" @click="language = key">{{ title }}</button>
      <button class="code-copy" :aria-label="copied ? 'Copied / 已复制' : 'Copy / 复制'" @click="copy">{{ copied ? '✓' : '⧉' }}</button>
    </div>
    <pre tabindex="0"><code>{{ code }}</code></pre>
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>
