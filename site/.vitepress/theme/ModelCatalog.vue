<script setup>
import { computed, ref } from 'vue';
import catalog from '../catalog.json';
import contracts from '../contracts.json';
import { modelOperations } from './openapi-content.mjs';
const props = defineProps({ locale: String });
const category = ref('all');
const query = ref('');
const rows = catalog.capabilities.flatMap(capability => capability.models.map(model => ({ ...model, capability, operations: modelOperations(contracts[capability.id], model.name) })));
const categories = [...new Set(rows.map(row => row.capability.category))];
const filtered = computed(() => rows.filter(row => (category.value === 'all' || row.capability.category === category.value) && `${row.name} ${row.title?.[props.locale] ?? ''} ${row.summary?.[props.locale] ?? ''} ${catalog.series[row.capability.category].title[props.locale]}`.toLowerCase().includes(query.value.trim().toLowerCase())));
</script>
<template>
  <div class="model-catalog">
    <label class="model-search"><span aria-hidden="true">⌕</span><input v-model="query" type="search" :placeholder="locale === 'zh' ? '搜索模型名称或能力…' : 'Search models or capabilities…'" :aria-label="locale === 'zh' ? '搜索模型' : 'Search models'" /></label>
    <div class="model-filters" :aria-label="locale === 'zh' ? '按系列筛选' : 'Filter by series'"><button :aria-pressed="category === 'all'" @click="category = 'all'">{{ locale === 'zh' ? '全部' : 'All' }} <span>{{ rows.length }}</span></button><button v-for="item in categories" :key="item" :aria-pressed="category === item" @click="category = item">{{ catalog.series[item].title[locale] }} <span>{{ rows.filter(row => row.capability.category === item).length }}</span></button></div>
    <div class="model-comparisons"><a v-for="capability in catalog.capabilities.filter(item => item.models.length && (category === 'all' || category === item.category))" :key="capability.id" :href="`/${locale}/api-reference/${capability.id}/`">{{ capability.title[locale] }} · {{ locale === 'zh' ? '比较模型与限制' : 'Compare models and limits' }} →</a></div>
    <p class="result-count" aria-live="polite">{{ locale === 'zh' ? `找到 ${filtered.length} 个公开调用名称` : `${filtered.length} public routes` }}</p>
    <div class="model-list">
      <a v-for="row in filtered" :key="`${row.capability.id}/${row.name}`" class="model-row" :href="`/${locale}/models/${row.capability.id}/${row.slug}`">
        <span class="model-row-main"><span class="model-category">{{ catalog.series[row.capability.category].title[locale] }}<template v-if="row.group"> · {{ row.group }}</template></span><strong>{{ row.title?.[locale] ?? row.name }}</strong><code v-if="row.title">{{ row.name }}</code><span v-if="row.summary" class="model-summary">{{ row.summary[locale] }}</span></span>
        <span class="model-operations"><span v-for="operation in row.operations" :key="operation.operation.operationId">{{ locale === 'zh' ? operation.operation['x-title-zh'] ?? operation.operation.summary : operation.operation.summary }}</span></span>
        <span class="model-arrow" aria-hidden="true">↗</span>
      </a>
    </div>
    <div v-if="!filtered.length" class="empty-state"><strong>{{ locale === 'zh' ? '没有匹配的模型' : 'No matching models' }}</strong><p>{{ locale === 'zh' ? '试试其他名称，或清除筛选条件。' : 'Try another name or clear the filters.' }}</p><button @click="query = ''; category = 'all'">{{ locale === 'zh' ? '清除筛选' : 'Clear filters' }}</button></div>
  </div>
</template>
