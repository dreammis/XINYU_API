<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({ spec: String, endpoint: String, method: String, locale: String });
const container = ref(null);
const error = ref('');
let reference;
let disposed = false;

onMounted(async () => {
  try {
    // 仅在打开接口页面时加载调试组件；每页使用同一规范中的当前操作。
    const [response, scalar] = await Promise.all([fetch(props.spec), import('@scalar/api-reference')]);
    if (!response.ok) throw new Error(`OpenAPI HTTP ${response.status}`);
    const spec = await response.json();
    const item = spec.paths[props.endpoint];
    if (!item?.[props.method]) throw new Error('Operation is missing from the public specification');
    const operation = item[props.method];
    if (props.locale === 'zh') {
      operation.summary = operation['x-title-zh'] ?? operation.summary;
      operation.description = operation['x-description-zh'] ?? operation.description;
    }
    spec.paths = { [props.endpoint]: { ...(item.parameters ? { parameters: item.parameters } : {}), [props.method]: operation } };
    spec.info.description = '';
    if (disposed) return;
    reference = scalar.createApiReference(container.value, {
      content: spec,
      localization: { locale: props.locale === 'zh' ? 'zh-CN' : 'en' },
      layout: 'modern',
      theme: 'none',
      showSidebar: false,
      showDeveloperTools: 'never',
      hideClientButton: true,
      hideModels: true,
      documentDownloadType: 'none',
      persistAuth: false,
      telemetry: false,
      agent: { disabled: true },
      proxyUrl: '/api-proxy',
      defaultHttpClient: { targetKey: 'shell', clientKey: 'curl' },
    });
  } catch (failure) {
    error.value = failure.message;
  }
});

onBeforeUnmount(() => {
  disposed = true;
  reference?.destroy();
});
</script>

<template>
  <div class="api-playground">
    <p v-if="error" role="alert">{{ locale === 'zh' ? '调试面板加载失败：' : 'Unable to load the API playground: ' }}{{ error }}</p>
    <div ref="container" />
  </div>
</template>

<style>
@import '@scalar/api-reference/style.css';
</style>
