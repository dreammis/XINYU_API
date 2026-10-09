<script setup>
import catalog from '../catalog.json';
defineProps({ id: String, locale: String });
</script>
<template>
  <template v-for="capability in catalog.capabilities.filter(item => item.id === id)" :key="id">
    <p class="series-intro">{{ catalog.series[capability.category].description[locale] }}</p>
    <div class="series-meta"><span>{{ locale === 'zh' ? `${capability.models.length} 个公开调用名` : `${capability.models.length} public routes` }}</span><span>{{ locale === 'zh' ? `${capability.operations.length} 个操作` : `${capability.operations.length} operations` }}</span><a :href="`/openapi/${id}.json`" target="_blank">OpenAPI {{ capability.version }} ↗</a></div>
    <div class="operation-links"><a v-for="operation in capability.operations" :key="operation.id" :href="`/${locale}/api-reference/${id}/${operation.slug}`"><span :class="['method-badge', operation.method]">{{ operation.method.toUpperCase() }}</span><strong>{{ operation.title[locale] }}</strong><code>{{ operation.endpoint }}</code><span aria-hidden="true">→</span></a></div>
    <h2>{{ locale === 'zh' ? '公开模型与调用入口' : 'Public models and API entry points' }}</h2>
    <template v-if="capability.models.length">
      <section v-for="group in capability.modelGroups" :key="group.id" class="series-model-family" :id="group.id ? `models-${group.id}` : undefined">
        <h3 v-if="group.id">{{ group.title[locale] }} <span class="family-count">{{ group.models.length }}</span></h3>
        <div class="model-chips"><a v-for="model in capability.models.filter(item => group.models.includes(item.name))" :key="model.name" :href="`/${locale}/models/${id}/${model.slug}`"><code>{{ model.name }}</code> ↗</a></div>
      </section>
    </template>
    <p v-else>{{ locale === 'zh' ? '这项能力不使用模型参数，直接按操作调用。' : 'This capability does not use a model parameter. Call its operations directly.' }}</p>
  </template>
</template>
