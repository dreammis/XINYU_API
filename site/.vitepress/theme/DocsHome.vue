<script setup>
import { ref } from 'vue';
import catalog from '../catalog.json';
import CodeExample from './CodeExample.vue';
import CapabilityGrid from './CapabilityGrid.vue';
import contracts from '../contracts.json';
import { requestCode, resolveSchema } from './openapi-content.mjs';
const props = defineProps({ locale: String });
const copied = ref(false);
const copyError = ref(false);
const first = catalog.capabilities[0];
const operation = first.operations.find(item => contracts[first.id].paths[item.endpoint][item.method].requestBody?.content?.['application/json']?.example);
const original = operation ? contracts[first.id].paths[operation.endpoint][operation.method].requestBody.content['application/json'].example : undefined;
// 首页保留契约示例的必填字段，完整扩展流程留在能力指南。
const required = operation ? resolveSchema(contracts[first.id], contracts[first.id].paths[operation.endpoint][operation.method].requestBody.content['application/json'].schema).required ?? [] : [];
const example = original ? Object.fromEntries(Object.entries(original).filter(([key]) => required.includes(key))) : undefined;
const codes = operation ? requestCode({ spec: contracts[first.id], endpoint: operation.endpoint, method: operation.method, mediaType: 'application/json', example }) : undefined;
const baseUrl = contracts[first.id].servers[0].url;
async function copyBase() {
  try { await navigator.clipboard.writeText(baseUrl); copied.value = true; setTimeout(() => { copied.value = false; }, 1800); }
  catch { copyError.value = true; }
}
</script>
<template>
  <div class="docs-home">
    <div class="home-eyebrow"><span /> {{ locale === 'zh' ? 'XY API · 开发者文档' : 'XY API · Developer docs' }}</div>
    <h1>{{ locale === 'zh' ? '图像与视频 API，统一调用。' : 'Image and video APIs. One gateway.' }}</h1>
    <p class="home-lead">{{ locale === 'zh' ? '生成图片、用参考图编辑，或创建视频任务。统一客户 Key 与计费，按模型能力选择接口，拿到可下载的结果。' : 'Generate images, edit with references, or create video tasks. One customer key and billing system, with model-specific APIs and downloadable results.' }}</p>
    <div class="home-actions"><a class="primary-link" :href="`/${locale}/quickstart`">{{ locale === 'zh' ? '开始第一次调用' : 'Make your first request' }} →</a><a class="secondary-link" href="https://openai.2yanx.dpdns.org" target="_blank" rel="noreferrer">{{ locale === 'zh' ? '获取 API Key' : 'Get an API key' }} ↗</a></div>
    <div class="base-url"><span>{{ locale === 'zh' ? '服务地址' : 'Base URL' }}</span><code>{{ baseUrl }}</code><button @click="copyBase">{{ copied ? (locale === 'zh' ? '已复制' : 'Copied') : (locale === 'zh' ? '复制' : 'Copy') }}</button></div>
    <span class="sr-only" role="status" aria-live="polite">{{ copied ? (locale === 'zh' ? '服务地址已复制' : 'Base URL copied') : '' }}</span>
    <p v-if="copyError" role="alert">{{ locale === 'zh' ? '复制失败，请手动选择地址。' : 'Copy failed. Select the address manually.' }}</p>
    <div class="home-section-title"><h2>{{ locale === 'zh' ? '选择你要做的事' : 'What would you like to build?' }}</h2><a :href="`/${locale}/capabilities`">{{ locale === 'zh' ? '全部系列' : 'All series' }} →</a></div>
    <CapabilityGrid :locale="locale" />
    <div class="home-section-title"><h2>{{ locale === 'zh' ? '直接查接口' : 'Jump to an API' }}</h2></div>
    <div class="home-operation-grid"><a v-for="item in catalog.capabilities.flatMap(capability => capability.operations.map(operation => ({ ...operation, capability: capability.id })))" :key="`${item.capability}/${item.id}`" :href="`/${locale}/api-reference/${item.capability}/${item.slug}`"><span :class="['method-badge', item.method]">{{ item.method.toUpperCase() }}</span><strong>{{ item.title[locale] }}</strong><code>{{ item.endpoint }}</code></a></div>
    <div class="home-start">
      <div><span class="home-eyebrow">{{ locale === 'zh' ? '开始使用' : 'GET STARTED' }}</span><h2>{{ locale === 'zh' ? '先完成一个最小请求' : 'Start with a small request' }}</h2><p>{{ locale === 'zh' ? '在控制台创建客户 Key，确认额度和模型权限，再复制右侧示例。生成请求按正常规则计费。' : 'Create a customer key, check credit and model permissions, then copy the example. Normal generation billing applies.' }}</p><ol><li><a :href="`/${locale}/authentication`">{{ locale === 'zh' ? '配置鉴权' : 'Configure authentication' }}</a></li><li><a :href="`/${locale}/models`">{{ locale === 'zh' ? '选择模型' : 'Choose a model' }}</a></li><li><a :href="`/${locale}/quickstart`">{{ locale === 'zh' ? '调用并获取结果' : 'Call and retrieve the result' }}</a></li></ol></div>
      <CodeExample v-if="codes" :codes="codes" />
      <a v-else :href="`/${locale}/api-reference/${first.id}/`">{{ locale === 'zh' ? '查看接口规范与示例 →' : 'Explore the API and examples →' }}</a>
    </div>
    <div class="home-footer-links"><a :href="`/${locale}/integration`">{{ locale === 'zh' ? '开始使用' : 'Get started' }} →</a><a :href="`/${locale}/billing`">{{ locale === 'zh' ? '计费规则' : 'Billing' }} →</a><a :href="`/${locale}/faq`">{{ locale === 'zh' ? '遇到问题？' : 'Need help?' }} →</a></div>
  </div>
</template>
