<script setup>
import UiIcon from './UiIcon.vue';
import { computed, onMounted, ref, watch } from 'vue';
import catalog from '../catalog.json';
import contracts from '../contracts.json';
import { modelOperations } from './openapi-content.mjs';
const props = defineProps({ locale: String });
const category = ref('all');
const query = ref('');
const rows = catalog.capabilities.flatMap(capability => capability.models.map(model => ({ ...model, capability, operations: modelOperations(contracts[capability.id], model.name).filter(item => !model.operations || model.operations.includes(item.operation.operationId)) })));
const categories = [...new Set(rows.map(row => row.capability.category))];
// 任务关键词由指南中明确“支持”的能力行生成，不把“不支持”也纳入任务匹配。
function searchText(row) {
  const supported = (row.facts?.[props.locale] ?? []).filter(fact => ['支持', 'Yes'].includes(fact.value)).map(fact => ({ 文生: '文生视频', 单图生: '图生视频', 多参考图生: '多参考图生视频', Text: 'text to video', 'Single image': 'image to video', 'Multiple references': 'reference to video' }[fact.label] ?? fact.label));
  return [row.name, row.title?.[props.locale], row.summary?.[props.locale], row.groupTitle?.[props.locale], catalog.series[row.capability.category].title[props.locale], ...supported, ...row.operations.map(item => props.locale === 'zh' ? item.operation['x-title-zh'] ?? item.operation.summary : item.operation.summary)].filter(Boolean).join(' ').toLowerCase();
}
const filtered = computed(() => rows.filter(row => (category.value === 'all' || row.capability.category === category.value) && searchText(row).includes(query.value.trim().toLowerCase())));
// 筛选结果仍按已登记的产品分组展示，自有模型保持独立分组。
const groups = computed(() => catalog.capabilities.flatMap(capability => capability.modelGroups.map(group => ({
  ...group, key: `${capability.id}/${group.id}`, category: capability.category,
  rows: filtered.value.filter(row => row.capability.id === capability.id && group.models.includes(row.name)),
}))).filter(group => group.rows.length));
onMounted(() => {
  const url = new URL(location.href);
  category.value = categories.includes(url.searchParams.get('series')) ? url.searchParams.get('series') : 'all';
  query.value = url.searchParams.get('q') ?? '';
  watch([category, query], ([series, search]) => {
    const url = new URL(location.href);
    if (series === 'all') url.searchParams.delete('series'); else url.searchParams.set('series', series);
    if (search) url.searchParams.set('q', search); else url.searchParams.delete('q');
    history.replaceState(history.state, '', url);
  });
});
</script>
<template>
  <div class="model-catalog">
    <label class="model-search"><UiIcon name="search" /><input v-model="query" type="search" name="q" autocomplete="off" :spellcheck="false" :placeholder="locale === 'zh' ? '搜索模型名称或能力…' : 'Search models or capabilities…'" :aria-label="locale === 'zh' ? '搜索模型' : 'Search models'" /></label>
    <div class="model-filters" :aria-label="locale === 'zh' ? '按系列筛选' : 'Filter by series'"><button :aria-pressed="category === 'all'" @click="category = 'all'">{{ locale === 'zh' ? '全部' : 'All' }} <span>{{ rows.length }}</span></button><button v-for="item in categories" :key="item" :aria-pressed="category === item" @click="category = item"><UiIcon :name="item" />{{ catalog.series[item].title[locale] }} <span>{{ rows.filter(row => row.capability.category === item).length }}</span></button></div>
    <div class="model-comparisons"><a v-for="capability in catalog.capabilities.filter(item => item.models.length && (category === 'all' || category === item.category))" :key="capability.id" :href="`/${locale}/api-reference/${capability.id}/`">{{ capability.title[locale] }} · {{ locale === 'zh' ? '比较模型与限制' : 'Compare models and limits' }} →</a></div>
    <p class="result-count" aria-live="polite">{{ locale === 'zh' ? `找到 ${filtered.length} 个公开调用名称` : `${filtered.length} public routes` }}</p>
    <section v-for="group in groups" :key="group.key" class="model-family">
      <div class="model-family-heading"><h2><UiIcon :name="group.category" />{{ group.title[locale] }}</h2><span>{{ catalog.series[group.category].title[locale] }} · {{ locale === 'zh' ? `${group.rows.length} 个模型` : `${group.rows.length} models` }}</span></div>
      <div class="model-list">
      <a v-for="row in group.rows" :key="`${row.capability.id}/${row.name}`" class="model-row" :href="`/${locale}/models/${row.capability.id}/${row.slug}`">
        <span class="model-icon"><UiIcon :name="row.capability.category" /></span><span class="model-row-main"><strong>{{ row.title?.[locale] ?? row.name }}</strong><code v-if="row.title">{{ row.name }}</code><span v-if="row.summary" class="model-summary">{{ row.summary[locale] }}</span></span>
        <span class="model-operations"><span v-for="operation in row.operations" :key="operation.operation.operationId">{{ locale === 'zh' ? operation.operation['x-title-zh'] ?? operation.operation.summary : operation.operation.summary }}</span></span>
        <UiIcon class="model-arrow" name="external" />
      </a>
      </div>
    </section>
    <div v-if="!filtered.length" class="empty-state"><strong>{{ locale === 'zh' ? '没有匹配的模型' : 'No matching models' }}</strong><p>{{ locale === 'zh' ? '试试其他名称，或清除筛选条件。' : 'Try another name or clear the filters.' }}</p><button @click="query = ''; category = 'all'">{{ locale === 'zh' ? '清除筛选' : 'Clear filters' }}</button></div>
  </div>
</template>
