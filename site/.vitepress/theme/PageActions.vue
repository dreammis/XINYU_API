<script setup>
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
const { page, lang } = useData();
const zh = computed(() => lang.value.startsWith('zh'));
const markdown = computed(() => `/markdown/${page.value.relativePath}`);
const status = ref('');
const copying = ref(false);

// 复制生成的客户 Markdown，避免把菜单、调试输入或客户 Key 一起从 DOM 复制出去。
async function copyPage() {
  copying.value = true;
  try {
    const response = await fetch(markdown.value);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await navigator.clipboard.writeText(await response.text());
    status.value = zh.value ? '已复制本页 Markdown' : 'Page Markdown copied';
  } catch (failure) { status.value = `${zh.value ? '复制失败' : 'Copy failed'}: ${failure.message}`; }
  finally { copying.value = false; }
}
</script>
<template>
  <div v-if="/^(zh|en)\//.test(page.relativePath)" class="page-actions"><button :disabled="copying" @click="copyPage">{{ zh ? '复制本页' : 'Copy page' }}</button><a :href="markdown" target="_blank" rel="noreferrer">Markdown ↗</a><a href="/llms.txt" target="_blank" rel="noreferrer">{{ zh ? '给 AI 使用 ↗' : 'For AI ↗' }}</a><span class="page-copy-status" role="status" aria-live="polite">{{ status }}</span></div>
</template>
