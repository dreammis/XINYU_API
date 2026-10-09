<script setup>
import { computed } from 'vue';
import { useData } from 'vitepress';
import catalog from '../catalog.json';
const { page, lang } = useData();
const locale = computed(() => lang.value.startsWith('zh') ? 'zh' : 'en');
const capability = computed(() => catalog.capabilities.find(item => page.value.relativePath.includes(`/${item.id}/`) || page.value.relativePath.endsWith(`/guides/${item.id}.md`)));
</script>
<template>
  <div v-if="!page.relativePath.endsWith('/index.md') || capability" class="doc-trail"><a :href="`/${locale}/`">{{ locale === 'zh' ? '文档' : 'Docs' }}</a><template v-if="capability"><span>/</span><a :href="`/${locale}/api-reference/${capability.id}/`">{{ catalog.series[capability.category].title[locale] }}</a><span class="contract-version">v{{ capability.version }}</span></template></div>
</template>
