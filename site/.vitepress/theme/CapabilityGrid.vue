<script setup>

import catalog from '../catalog.json';
import UiIcon from './UiIcon.vue';
defineProps({ locale: String, showPending: { type: Boolean, default: false } });
</script>
<template>
  <div class="capability-grid">
    <template v-for="(series, category) in catalog.series" :key="category">
      <div v-if="catalog.capabilities.some(item => item.category === category) || (showPending && category !== 'other')" class="capability-card" :class="{ pending: !catalog.capabilities.some(item => item.category === category) }">
        <UiIcon :name="series.symbol" />
        <span class="card-status">{{ catalog.capabilities.some(item => item.category === category) ? (locale === 'zh' ? '已发布文档' : 'Documented') : (locale === 'zh' ? '尚未发布接口' : 'Not published') }}</span>
        <h3>{{ series.title[locale] }}</h3>
        <p>{{ series.description[locale] }}</p>
        <a v-for="capability in catalog.capabilities.filter(item => item.category === category)" :key="capability.id" :href="`/${locale}/api-reference/${capability.id}/`">{{ locale === 'zh' ? '查看模型与接口' : 'Models and APIs' }}<span aria-hidden="true"> →</span></a>
      </div>
    </template>
  </div>
</template>
