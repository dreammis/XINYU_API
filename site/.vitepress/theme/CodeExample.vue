<script setup>
import { computed, onMounted, onBeforeUnmount, ref, useId, watch } from 'vue';
import { highlightCode } from './code-highlighter.mjs';
const props = defineProps({ codes: Object, label: String });
const languages = computed(() => Object.keys(props.codes));
const language = ref(languages.value[0]);
const id = useId();
const copied = ref(false);
const error = ref('');
const code = computed(() => props.codes[language.value]);
const highlighted = ref('');
const titles = { curl: 'cURL', python: 'Python', javascript: 'Node.js', json: 'JSON', text: 'SSE' };
let stop;
let version = 0;
onMounted(() => {
  stop = watch([code, language], async ([value, lang]) => {
    const current = ++version;
    highlighted.value = '';
    try {
      const html = await highlightCode(value, lang);
      if (current === version) highlighted.value = html;
    } catch (failure) { error.value = `Code highlighting failed: ${failure.message}`; }
  }, { immediate: true });
});
watch(languages, values => { if (!values.includes(language.value)) language.value = values[0]; });
onBeforeUnmount(() => { stop?.(); version++; });
function moveTab(event) {
  const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  if (!direction) return;
  event.preventDefault();
  const next = (languages.value.indexOf(language.value) + direction + languages.value.length) % languages.value.length;
  language.value = languages.value[next];
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
    <div class="code-toolbar"><div class="code-tabs" role="tablist" :aria-label="label || 'Code language'">
      <button v-for="key in languages" :id="`${id}-${key}`" :key="key" role="tab" :aria-controls="`${id}-panel`" :aria-selected="language === key" :tabindex="language === key ? 0 : -1" @keydown="moveTab" @click="language = key">{{ titles[key] ?? key }}</button>
      </div>
      <button class="code-copy" :aria-label="copied ? 'Copied / 已复制' : 'Copy / 复制'" @click="copy">{{ copied ? '✓' : '⧉' }}</button>
    </div>
    <div :id="`${id}-panel`" role="tabpanel" :aria-labelledby="`${id}-${language}`" tabindex="0"><div v-if="highlighted" v-html="highlighted" /><pre v-else><code>{{ code }}</code></pre></div>
    <span class="sr-only" role="status" aria-live="polite">{{ copied ? 'Copied / 已复制' : '' }}</span>
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>
