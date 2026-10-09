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
    <h1>{{ locale === 'zh' ? '从想法，到第一次调用。' : 'From an idea to your first API call.' }}</h1>
    <p class="home-lead">{{ locale === 'zh' ? '用一个客户入口调用图像、视频与更多服务。先选能力，再选模型，按完整流程拿到结果。' : 'One customer gateway for images, video and more. Choose a capability, select a model, then follow the flow to your result.' }}</p>
    <div class="home-actions"><a class="primary-link" :href="`/${locale}/quickstart`">{{ locale === 'zh' ? '开始第一次调用' : 'Make your first request' }} →</a><a class="secondary-link" href="https://openai.2yanx.dpdns.org" target="_blank" rel="noreferrer">{{ locale === 'zh' ? '获取 API Key' : 'Get an API key' }} ↗</a></div>
    <div class="base-url"><span>{{ locale === 'zh' ? '服务地址' : 'Base URL' }}</span><code>{{ baseUrl }}</code><button @click="copyBase">{{ copied ? (locale === 'zh' ? '已复制' : 'Copied') : (locale === 'zh' ? '复制' : 'Copy') }}</button></div>
    <p v-if="copyError" role="alert">{{ locale === 'zh' ? '复制失败，请手动选择地址。' : 'Copy failed. Select the address manually.' }}</p>
    <div class="home-section-title"><h2>{{ locale === 'zh' ? '选择你要做的事' : 'What would you like to build?' }}</h2><a :href="`/${locale}/capabilities`">{{ locale === 'zh' ? '全部系列' : 'All series' }} →</a></div>
    <CapabilityGrid :locale="locale" />
    <div class="home-start">
      <div><span class="home-eyebrow">{{ locale === 'zh' ? '开始使用' : 'GET STARTED' }}</span><h2>{{ locale === 'zh' ? '先完成一个最小请求' : 'Start with a small request' }}</h2><p>{{ locale === 'zh' ? '在控制台创建客户 Key，确认额度和模型权限，再复制右侧示例。生成请求按正常规则计费。' : 'Create a customer key, check credit and model permissions, then copy the example. Normal generation billing applies.' }}</p><ol><li><a :href="`/${locale}/authentication`">{{ locale === 'zh' ? '配置鉴权' : 'Configure authentication' }}</a></li><li><a :href="`/${locale}/models`">{{ locale === 'zh' ? '选择模型' : 'Choose a model' }}</a></li><li><a :href="`/${locale}/quickstart`">{{ locale === 'zh' ? '调用并获取结果' : 'Call and retrieve the result' }}</a></li></ol></div>
      <CodeExample v-if="codes" :codes="codes" />
      <a v-else :href="`/${locale}/api-reference/${first.id}/`">{{ locale === 'zh' ? '查看接口规范与示例 →' : 'Explore the API and examples →' }}</a>
    </div>
    <div class="home-footer-links"><a :href="`/${locale}/integration`">{{ locale === 'zh' ? '接入指南' : 'Integration guides' }} →</a><a :href="`/${locale}/billing`">{{ locale === 'zh' ? '计费规则' : 'Billing' }} →</a><a :href="`/${locale}/faq`">{{ locale === 'zh' ? '遇到问题？' : 'Need help?' }} →</a></div>
  </div>
</template>
