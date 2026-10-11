<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { JsonForms } from '@jsonforms/vue';
import { rankWith, uiTypeIs, isBooleanControl, schemaMatches, and } from '@jsonforms/core';
import { vanillaRenderers } from '@jsonforms/vue-vanilla';
import CodeExample from './CodeExample.vue';
import RequestFileField from './RequestFileField.vue';
import RequestBooleanField from './RequestBooleanField.vue';
import RequestValueField from './RequestValueField.vue';
import UiIcon from './UiIcon.vue';
import { requestCode } from './openapi-content.mjs';
import { buildPlaygroundRequest, createRequestValidator, requestFormData, requestFormDefinition } from './request-form.mjs';
import './request-dialog.css';

const props = defineProps({ spec: Object, endpoint: String, method: String, mediaType: String, model: String, locale: String, example: Object, responseExample: [Object, String], responseStatus: String, responseType: String });
const zh = computed(() => props.locale === 'zh');
const dialog = ref(null);
const form = ref(null);
const open = ref(false);
const key = ref('');
const showKey = ref(false);
const editor = ref('form');
const draft = ref('');
const rawError = ref('');
const error = ref('');
const validationMode = ref('ValidateAndHide');
const formErrors = ref([]);
const data = ref({});
const activePanel = ref('request');
const sending = ref(false);
const actualResponse = ref(null);
const responseTab = ref('body');
const ajv = createRequestValidator();
// API 输入实时更新；枚举、数组、嵌套布局继续使用开源渲染器，三态布尔和文件按协议扩展。
const renderers = Object.freeze([...vanillaRenderers,
  { tester: rankWith(10, (uischema, schema, context) => uiTypeIs('Control')(uischema, schema, context) && uischema.options?.apiFile), renderer: RequestFileField },
  { tester: rankWith(10, isBooleanControl), renderer: RequestBooleanField },
  { tester: rankWith(10, and(uiTypeIs('Control'), schemaMatches(schema => ['string', 'number', 'integer'].includes(schema.type) && !schema.enum && !schema.oneOf && schema.format !== 'binary'))), renderer: RequestValueField },
]);
const definition = computed(() => requestFormDefinition(props));
const operation = computed(() => props.spec.paths[props.endpoint][props.method]);
const description = computed(() => zh.value ? operation.value['x-description-zh'] ?? operation.value.description : operation.value.description);
const title = computed(() => zh.value ? operation.value['x-title-zh'] ?? operation.value.summary : operation.value.summary);
const hasBody = computed(() => Boolean(operation.value.requestBody));
const validate = computed(() => ajv.compile(definition.value.schema));
const preview = computed(() => {
  try { return buildPlaygroundRequest({ ...props, data: data.value, apiKey: 'YOUR_API_KEY' }); }
  catch { return null; } // 路径必填项尚未填写时，示例保留占位符；发送仍必须通过校验。
});
const codes = computed(() => requestCode({ ...props, example: hasBody.value ? data.value.body : undefined, parameters: data.value, requestUrl: preview.value?.url }));
const sampleCodes = computed(() => props.responseExample === undefined ? null : { [typeof props.responseExample === 'string' ? 'text' : 'json']: typeof props.responseExample === 'string' ? props.responseExample : JSON.stringify(props.responseExample, null, 2) });
let abort;
let returnFocus;
let previousOverflow;

function clearResponse() {
  if (actualResponse.value?.url) URL.revokeObjectURL(actualResponse.value.url);
  actualResponse.value = null;
  responseTab.value = 'body';
}

// 模型、媒体类型和调用模式改变后重置参数；客户 Key 只在当前组件内存中保留。
watch(() => [props.spec, props.endpoint, props.method, props.mediaType, props.model, props.example], () => {
  abort?.abort();
  data.value = requestFormData({ ...props, parameters: definition.value.parameters, hasBody: hasBody.value });
  draft.value = JSON.stringify(data.value.body ?? {}, null, 2);
  editor.value = 'form';
  validationMode.value = 'ValidateAndHide';
  rawError.value = error.value = '';
  clearResponse();
}, { immediate: true });

function changeForm(event) {
  data.value = event.data;
  formErrors.value = event.errors ?? [];
  if (editor.value === 'form') draft.value = JSON.stringify(event.data.body ?? {}, null, 2);
}

function editJson(value) {
  draft.value = value;
  try {
    const parsed = JSON.parse(value);
    data.value = { ...data.value, body: parsed };
    rawError.value = '';
  } catch { rawError.value = zh.value ? '请求体不是有效的 JSON，请修改后再发送。' : 'The request body is not valid JSON.'; }
}

async function show() {
  returnFocus = document.activeElement;
  await nextTick();
  if (dialog.value.open) return;
  dialog.value.showModal();
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  open.value = true;
  await nextTick();
  dialog.value.querySelector('input')?.focus();
}

function close() {
  abort?.abort();
  if (dialog.value?.open) dialog.value.close();
  if (!open.value) return;
  open.value = false;
  document.body.style.overflow = previousOverflow;
  returnFocus?.focus();
}

// 使用本站受限代理；JSON、multipart 和真实流式响应分别处理，绝不将响应样例冒充执行结果。
async function send() {
  if (sending.value) return;
  error.value = '';
  validationMode.value = 'ValidateAndShow';
  if (!key.value.trim().replace(/^Bearer\s+/i, '')) { error.value = zh.value ? '请填写自己的 API Key。' : 'Enter your API key.'; return; }
  if (rawError.value) { error.value = rawError.value; return; }
  if (!validate.value(data.value)) { error.value = zh.value ? '请检查参数：必填项、类型或组合限制未通过校验。' : 'Check required fields, types and input constraints.'; return; }
  sending.value = true;
  clearResponse();
  abort = new AbortController();
  const currentAbort = abort;
  const started = performance.now();
  try {
    const request = buildPlaygroundRequest({ ...props, data: data.value, apiKey: key.value });
    const response = await fetch(`/api-proxy?scalar_url=${encodeURIComponent(request.url)}`, { ...request.init, signal: currentAbort.signal });
    const type = response.headers.get('Content-Type')?.split(';')[0] ?? 'text/plain';
    const result = { status: response.status, type, duration: 0, text: '', headers: Object.fromEntries(response.headers), url: '', bytes: 0, filename: '' };
    actualResponse.value = result;
    activePanel.value = 'response';
    if (type === 'text/event-stream') {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const chunk = await reader.read();
        if (currentAbort.signal.aborted) return;
        if (chunk.done) break;
        actualResponse.value.text += decoder.decode(chunk.value, { stream: true });
        actualResponse.value.bytes += chunk.value.byteLength;
        actualResponse.value.duration = Math.round(performance.now() - started);
      }
      if (currentAbort.signal.aborted) return;
      actualResponse.value.text += decoder.decode();
    } else if (/^(audio|video|image)\//.test(type) || type === 'application/octet-stream') {
      const blob = await response.blob();
      if (currentAbort.signal.aborted) return;
      result.url = URL.createObjectURL(blob);
      result.bytes = blob.size;
      result.filename = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)/)?.[1]?.split(/[/\\]/).at(-1) ?? `result.${type.startsWith('audio/') ? 'mp3' : type.startsWith('video/') ? 'mp4' : 'bin'}`;
      actualResponse.value = result;
    } else {
      const text = await response.text();
      if (currentAbort.signal.aborted) return;
      try { result.text = JSON.stringify(JSON.parse(text), null, 2); } catch { result.text = text; }
      result.bytes = new TextEncoder().encode(text).length;
      actualResponse.value = result;
    }
    if (!currentAbort.signal.aborted) actualResponse.value.duration = Math.round(performance.now() - started);
  } catch (failure) {
    if (currentAbort.signal.aborted) error.value = zh.value ? '已停止接收响应；已提交的任务可能继续执行。' : 'Stopped receiving. A submitted task may still run.';
    else error.value = `${zh.value ? '请求失败' : 'Request failed'}: ${failure.message}`;
  } finally {
    if (abort === currentAbort) sending.value = false;
  }
}

onBeforeUnmount(() => { close(); clearResponse(); key.value = ''; });
defineExpose({ open: show });
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="request-dialog" :lang="zh ? 'zh-CN' : 'en'" aria-labelledby="request-dialog-title" @cancel.prevent="close" @close="close" @click="event => { if (event.target === dialog) close(); }" @keydown="event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); send(); } }">
      <div class="request-dialog-content">
        <header class="request-dialog-header"><div><span class="request-eyebrow">{{ model || 'XY API' }}</span><h2 id="request-dialog-title">{{ title }}</h2></div><button class="request-close" :aria-label="zh ? '关闭调试' : 'Close playground'" @click="close"><UiIcon name="close" /></button></header>
        <form ref="form" class="request-address" @submit.prevent="send"><span :class="['method-badge', method]">{{ method.toUpperCase() }}</span><code>{{ preview?.url || spec.servers[0].url + endpoint }}</code><button v-if="sending" type="button" class="request-send" @click="abort?.abort()">{{ zh ? '停止接收' : 'Stop' }}</button><button v-else type="submit" class="request-send">{{ zh ? '发送' : 'Send' }} <span aria-hidden="true">→</span></button></form>
        <div class="request-mobile-tabs"><button :aria-pressed="activePanel === 'request'" @click="activePanel = 'request'">{{ zh ? '请求参数' : 'Request' }}</button><button :aria-pressed="activePanel === 'response'" @click="activePanel = 'response'">{{ zh ? '示例与响应' : 'Examples & response' }}</button></div>
        <div class="request-dialog-grid">
          <section class="request-input-panel" :class="{ 'mobile-hidden': activePanel !== 'request' }" :aria-label="zh ? '请求参数' : 'Request parameters'">
            <p v-if="description" class="request-operation-description">{{ description }}</p>
            <fieldset class="request-auth"><legend>{{ zh ? '鉴权' : 'Authorization' }}</legend><label for="request-api-key">API Key <span class="request-required">{{ zh ? '必填' : 'required' }}</span></label><div class="request-key-input"><input id="request-api-key" v-model="key" :type="showKey ? 'text' : 'password'" autocomplete="off" spellcheck="false" placeholder="sk-…" /><button type="button" :aria-pressed="showKey" @click="showKey = !showKey">{{ showKey ? (zh ? '隐藏' : 'Hide') : (zh ? '显示' : 'Show') }}</button></div><p>{{ zh ? '填写自己的 API Key，自动添加 Bearer。仅在本页内存中保留。' : 'Enter your API key. Bearer is added automatically. Kept only in page memory.' }}</p></fieldset>
            <div v-if="hasBody && mediaType === 'application/json'" class="request-editor-tabs"><button :aria-pressed="editor === 'form'" @click="editor = 'form'; rawError = ''">{{ zh ? '参数表单' : 'Form' }}</button><button :aria-pressed="editor === 'json'" @click="editor = 'json'">JSON</button></div>
            <JsonForms v-show="editor === 'form'" class="request-schema-form" :data="data" :schema="definition.schema" :uischema="definition.uischema" :renderers="renderers" :ajv="ajv" :config="{ showUnfocusedDescription: true, locale }" :validation-mode="validationMode" @change="changeForm" />
            <div v-if="editor === 'json'" class="request-json-editor"><label for="request-json">{{ zh ? '请求体 · JSON' : 'Request body · JSON' }}</label><textarea id="request-json" :value="draft" spellcheck="false" @input="editJson($event.target.value)" /><p v-if="rawError" role="alert">{{ rawError }}</p><p>{{ zh ? '编辑 JSON 后，可切回参数表单查看各项说明。' : 'Switch back to the form to see parameter descriptions.' }}</p></div>
            <p v-if="error" class="request-error" role="alert">{{ error }}</p>
            <p v-if="validationMode === 'ValidateAndShow' && formErrors.length" class="request-error">{{ formErrors.map(item => `${item.instancePath || '/'}: ${item.message}`).join('\n') }}</p>
          </section>
          <section class="request-result-panel" :class="{ 'mobile-hidden': activePanel !== 'response' }" :aria-label="zh ? '示例与响应' : 'Examples and response'">
            <div class="request-panel-title">{{ zh ? '请求代码' : 'Request code' }}<span>{{ zh ? '随参数更新' : 'Updates with parameters' }}</span></div><CodeExample :codes="codes" />
            <div class="request-panel-title response-title"><span>{{ actualResponse ? (zh ? '实际响应' : 'Actual response') : (zh ? '响应示例' : 'Response example') }}</span><span v-if="actualResponse" :class="{ 'request-http-error': actualResponse.status >= 400 }">{{ actualResponse.status }} · {{ actualResponse.duration }} ms</span><span v-else>{{ responseStatus }} · {{ responseType }}</span></div>
            <template v-if="actualResponse"><div class="request-response-tabs"><button :aria-pressed="responseTab === 'body'" @click="responseTab = 'body'">{{ zh ? '响应体' : 'Body' }}</button><button :aria-pressed="responseTab === 'headers'" @click="responseTab = 'headers'">{{ zh ? '响应头' : 'Headers' }}</button><span v-if="sending" role="status">{{ zh ? '接收中…' : 'Receiving…' }}</span></div><CodeExample v-if="responseTab === 'headers'" :codes="{ json: JSON.stringify(actualResponse.headers, null, 2) }" /><div v-else-if="actualResponse.url" class="request-media-result"><audio v-if="actualResponse.type.startsWith('audio/')" :src="actualResponse.url" controls /><video v-else-if="actualResponse.type.startsWith('video/')" :src="actualResponse.url" controls /><img v-else-if="actualResponse.type.startsWith('image/')" :src="actualResponse.url" :alt="zh ? '接口返回的图片' : 'Returned image'" /><p>{{ actualResponse.type }} · {{ actualResponse.bytes }} B</p><a :href="actualResponse.url" :download="actualResponse.filename">{{ zh ? '下载文件' : 'Download file' }} ↓</a></div><pre v-else class="request-live-response"><code>{{ actualResponse.text || (method === 'head' ? (zh ? 'HEAD 请求不返回响应体，请查看响应头。' : 'HEAD returns headers only.') : (zh ? '响应体为空。' : 'Empty response body.')) }}</code></pre></template>
            <CodeExample v-else-if="sampleCodes" :codes="sampleCodes" /><p v-else class="request-empty-response">{{ zh ? '此模式没有公开响应示例。发送请求后将在这里显示实际响应。' : 'No response example for this mode. Send a request to see the actual response.' }}</p>
          </section>
        </div>
        <footer class="request-dialog-footer"><span>{{ zh ? '生成请求正常计费。关闭或停止接收不会撤销已提交的任务。' : 'Generation is billed normally. Closing or stopping reception does not revoke a submitted task.' }}</span><span class="request-shortcut">Ctrl / ⌘ + Enter</span></footer>
      </div>
    </dialog>
  </Teleport>
</template>
