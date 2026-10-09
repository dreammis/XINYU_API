<script setup>
import { computed } from 'vue';
import catalog from '../catalog.json';
import contracts from '../contracts.json';
import CodeExample from './CodeExample.vue';
import { modelOperations, requestCode, requestExample } from './openapi-content.mjs';
const props = defineProps({ id: String, model: String, locale: String });
const capability = computed(() => catalog.capabilities.find(item => item.id === props.id));
const spec = computed(() => contracts[props.id]);
const detail = computed(() => capability.value.models.find(item => item.name === props.model));
const operations = computed(() => modelOperations(spec.value, props.model).filter(item => !detail.value.operations || detail.value.operations.includes(item.operation.operationId)));
const codes = computed(() => {
  const operation = operations.value[0];
  if (!operation) return undefined;
  const body = operation.operation.requestBody?.content?.['application/json'];
  const example = requestExample(spec.value, body, props.model);
  return example === undefined ? undefined : requestCode({ spec: spec.value, endpoint: operation.endpoint, method: operation.method, mediaType: 'application/json', example });
});
</script>
<template>
  <div class="model-detail">
    <dl class="model-facts"><div><dt>{{ locale === 'zh' ? '调用名称' : 'Route name' }}</dt><dd><code>{{ model }}</code></dd></div><div><dt>{{ locale === 'zh' ? '所属系列' : 'Series' }}</dt><dd>{{ catalog.series[capability.category].title[locale] }}</dd></div><div><dt>{{ locale === 'zh' ? '契约版本' : 'Contract version' }}</dt><dd>{{ capability.version }}</dd></div></dl>
    <a class="selection-link" :href="`/${locale}/api-reference/${id}/`"><strong>{{ locale === 'zh' ? '先比较能力与限制' : 'Compare capabilities and limits' }}</strong><span>{{ locale === 'zh' ? '查看同系列模型的尺寸、输入与其他适用限制。' : 'Check dimensions, inputs and other applicable limits for this series.' }}</span><span aria-hidden="true">→</span></a>
    <h2>{{ locale === 'zh' ? '适用接口' : 'Supported APIs' }}</h2>
    <div class="operation-links"><a v-for="item in operations" :key="item.operation.operationId" :href="`/${locale}/api-reference/${id}/${capability.operations.find(operation => operation.id === item.operation.operationId).slug}`"><span :class="['method-badge', item.method]">{{ item.method.toUpperCase() }}</span><strong>{{ locale === 'zh' ? item.operation['x-title-zh'] ?? item.operation.summary : item.operation.summary }}</strong><code>{{ item.endpoint }}</code><span aria-hidden="true">→</span></a></div>
    <h2 v-if="codes">{{ locale === 'zh' ? '调用示例' : 'Request example' }}</h2>
    <CodeExample v-if="codes" :codes="codes" />
    <p>{{ locale === 'zh' ? '示例中的 Key 为占位符。详细参数、异步或流式流程和结果获取方式，以接口页和使用指南为准。' : 'The key is a placeholder. Refer to the API and usage guide for parameters, asynchronous or streaming flows and result retrieval.' }}</p>
    <div class="home-footer-links"><a :href="`/${locale}/guides/${id}`">{{ locale === 'zh' ? '完整使用指南' : 'Full usage guide' }} →</a><a :href="`/${locale}/billing`">{{ locale === 'zh' ? '计费规则' : 'Billing' }} →</a><a :href="`/${locale}/models`">{{ locale === 'zh' ? '返回模型中心' : 'Back to models' }} →</a></div>
  </div>
</template>
