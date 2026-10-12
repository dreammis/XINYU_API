<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { JsonForms } from '@jsonforms/vue';
import { rankWith, uiTypeIs, isBooleanControl, schemaMatches, and } from '@jsonforms/core';
import { vanillaRenderers } from '@jsonforms/vue-vanilla';
import CodeExample from './CodeExample.vue';
import RequestFileField from './RequestFileField.vue';
import RequestBooleanField from './RequestBooleanField.vue';
import RequestValueField from './RequestValueField.vue';
import RequestUnionField from './RequestUnionField.vue';
import UiIcon from './UiIcon.vue';
import { executionMode, executionLabels, taskState, createSseParser, streamOutcome } from './execution-mode.mjs';
import { requestCode, operationExamples, responseExampleFor } from './openapi-content.mjs';
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
  { tester: rankWith(10, and(uiTypeIs('Control'), schemaMatches(schema => schema.oneOf?.length > 0 && schema.oneOf.every(branch => ['string', 'number', 'integer'].includes(branch.type))))), renderer: RequestUnionField },
  { tester: rankWith(10, and(uiTypeIs('Control'), schemaMatches(schema => ['string', 'number', 'integer'].includes(schema.type) && !schema.enum && !schema.oneOf && schema.format !== 'binary'))), renderer: RequestValueField },
]);
const definition = computed(() => requestFormDefinition(props));
const operation = computed(() => props.spec.paths[props.endpoint][props.method]);
const execution = computed(() => executionMode(operation.value, data.value.body));
const modes = computed(() => operationExamples(props.spec, operation.value, props.mediaType, props.model));
const currentMode = computed(() => data.value.body?.background === true ? 'background' : execution.value === 'stream' ? (data.value.body?.delivery === 'url' ? 'stream-url' : 'stream') : 'json');
function switchMode(value) {
  if (sending.value || taskBusy.value) return;
  const body = {...data.value.body};
  for (const field of ['stream', 'background', 'delivery', 'progress']) delete body[field];
  const chosen = modes.value.find(item => item.id === value);
  for (const field of ['stream', 'background', 'delivery']) if (chosen.example?.[field] !== undefined) body[field] = chosen.example[field];
  data.value = {...data.value, body};
  draft.value = JSON.stringify(body, null, 2);
  rawError.value = ''; stopQuery(); task.value = null; clearResponse();
}
const taskProtocol = computed(() => operation.value['x-playground-task']);
const task = ref(null);
const taskBusy = ref(false);
const autoQuery = ref(false);
let queryTimer;
function stopQuery() { autoQuery.value = false; clearTimeout(queryTimer); }
const description = computed(() => zh.value ? operation.value['x-description-zh'] ?? operation.value.description : operation.value.description);
const title = computed(() => zh.value ? operation.value['x-title-zh'] ?? operation.value.summary : operation.value.summary);
const hasBody = computed(() => Boolean(operation.value.requestBody));
const validate = computed(() => ajv.compile(definition.value.schema));
const preview = computed(() => {
  try { return buildPlaygroundRequest({ ...props, data: data.value, apiKey: 'YOUR_API_KEY' }); }
  catch { return null; } // 路径必填项尚未填写时，示例保留占位符；发送仍必须通过校验。
});
const codes = computed(() => requestCode({ ...props, example: hasBody.value ? data.value.body : undefined, parameters: data.value, requestUrl: preview.value?.url }));
const sampleType = computed(() => /^2/.test(props.responseStatus) ? modes.value.find(item => item.id === currentMode.value)?.responseType ?? props.responseType : props.responseType);
const sampleCodes = computed(() => {
  const value = responseExampleFor(operation.value, props.responseStatus, sampleType.value, data.value.body);
  return value === undefined ? null : {[typeof value === 'string' ? 'text' : 'json']: typeof value === 'string' ? value : JSON.stringify(value, null, 2)};
});
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
  stopQuery(); task.value = null;
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

// 离开无效 JSON 时恢复当前有效表单，避免重新进入编辑器仍显示无效草稿却发送旧值。
function switchEditor(value) {
  if (value === 'form') {
    draft.value = JSON.stringify(data.value.body ?? {}, null, 2);
    rawError.value = '';
  }
  editor.value = value;
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
  stopQuery();
  abort?.abort();
  if (dialog.value?.open) dialog.value.close();
  if (!open.value) return;
  open.value = false;
  document.body.style.overflow = previousOverflow;
  returnFocus?.focus();
}

// 使用本站受限代理；JSON、multipart 和真实流式响应分别处理，绝不将响应样例冒充执行结果。
async function send() {
  if (sending.value || taskBusy.value) return;
  error.value = '';
  validationMode.value = 'ValidateAndShow';
  if (!key.value.trim().replace(/^Bearer\s+/i, '')) { error.value = zh.value ? '请填写自己的 API Key。' : 'Enter your API key.'; return; }
  if (rawError.value) { error.value = rawError.value; return; }
  if (!validate.value(data.value)) { error.value = zh.value ? '请检查参数：必填项、类型或组合限制未通过校验。' : 'Check required fields, types and input constraints.'; return; }
  sending.value = true;
  stopQuery(); task.value = null;
  clearResponse();
  abort = new AbortController();
  const currentAbort = abort;
  const started = performance.now();
  try {
    const request = buildPlaygroundRequest({ ...props, data: data.value, apiKey: key.value });
    const response = await fetch(`/api-proxy?scalar_url=${encodeURIComponent(request.url)}`, { ...request.init, signal: currentAbort.signal });
    await receive(response, currentAbort, started);
    if (!currentAbort.signal.aborted && response.ok && execution.value === 'async') task.value = taskState(taskProtocol.value, JSON.parse(actualResponse.value.text));
  } catch (failure) {
    if (currentAbort.signal.aborted) error.value = zh.value ? '已停止接收响应；已提交的任务可能继续执行。' : 'Stopped receiving. A submitted task may still run.';
    else error.value = `${zh.value ? '请求失败' : 'Request failed'}: ${failure.message}`;
  } finally {
    if (abort === currentAbort) sending.value = false;
  }
}

// 首次请求、任务查询和文件获取共用实际响应处理；查询不会重新发送生成 POST。
async function receive(response, currentAbort, started) {
    const type = response.headers.get('Content-Type')?.split(';')[0] ?? 'text/plain';
    const result = { status: response.status, type, duration: 0, text: '', headers: Object.fromEntries(response.headers), url: '', bytes: 0, filename: '', events: [], streamState: 'receiving' };
    actualResponse.value = result;
    activePanel.value = 'response';
    if (type === 'text/event-stream') {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parse = createSseParser(event => {
        actualResponse.value.events.push(event);
        const outcome = streamOutcome(operation.value, event);
        if (outcome) actualResponse.value.streamState = outcome;
      });
      responseTab.value = 'events';
      while (true) {
        const chunk = await reader.read();
        if (currentAbort.signal.aborted) return;
        if (chunk.done) break;
        const text = decoder.decode(chunk.value, { stream: true });
        actualResponse.value.text += text;
        parse(text);
        actualResponse.value.bytes += chunk.value.byteLength;
        actualResponse.value.duration = Math.round(performance.now() - started);
      }
      if (currentAbort.signal.aborted) return;
      const tail = decoder.decode();
      actualResponse.value.text += tail;
      parse(tail);
      if (actualResponse.value.streamState === 'receiving') actualResponse.value.streamState = 'closed';
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
}

async function followup(endpoint, path, signal) {
  const request = buildPlaygroundRequest({...props, endpoint, method: 'get', data: {path}, apiKey: key.value});
  return fetch(`/api-proxy?scalar_url=${encodeURIComponent(request.url)}`, {...request.init, signal});
}

async function queryTask() {
  if (taskBusy.value || sending.value || !task.value) return;
  taskBusy.value = true;
  error.value = '';
  abort = new AbortController();
  const currentAbort = abort;
  const started = performance.now();
  try {
    const response = await followup(taskProtocol.value.poll, {[taskProtocol.value.parameter]: task.value.id}, currentAbort.signal);
    if (currentAbort.signal.aborted) return;
    clearResponse();
    await receive(response, currentAbort, started);
    if (currentAbort.signal.aborted) return;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const updated = taskState(taskProtocol.value, JSON.parse(actualResponse.value.text));
    if (updated.id !== task.value.id) throw new Error('Task ID mismatch');
    task.value = updated;
    if (updated.complete || updated.failed) stopQuery();
    else if (autoQuery.value && open.value) queryTimer = setTimeout(queryTask, 3000);
  } catch (failure) { stopQuery(); error.value = failure.message; }
  finally { taskBusy.value = false; }
}

function toggleQuery() {
  if (autoQuery.value) stopQuery();
  else {autoQuery.value = true; queryTask();}
}

async function downloadTask() {
  if (taskBusy.value || !task.value?.complete) return;
  stopQuery();
  taskBusy.value = true;
  error.value = '';
  abort = new AbortController();
  const currentAbort = abort;
  const started = performance.now();
  try {
    const path = {[taskProtocol.value.parameter]: task.value.id};
    if (taskProtocol.value.artifacts) {
      const response = await followup(taskProtocol.value.artifacts, path, currentAbort.signal);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const list = await response.json();
      // 当前 TTS 契约一任务一份 MP3；通过已登记的下载入口取文件，不向返回的任意 URL 转发 Key。
      if (list.task_id !== task.value.id || list.artifacts?.length !== 1 || typeof list.artifacts[0].key !== 'string') throw new Error('Invalid audio artifact response');
      path.artifact_key = list.artifacts[0].key;
    }
    const response = await followup(taskProtocol.value.download, path, currentAbort.signal);
    if (currentAbort.signal.aborted) return;
    clearResponse();
    await receive(response, currentAbort, started);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (failure) { error.value = failure.message; }
  finally { taskBusy.value = false; }
}

onBeforeUnmount(() => { close(); clearResponse(); key.value = ''; });
defineExpose({ open: show });
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="request-dialog" :lang="zh ? 'zh-CN' : 'en'" aria-labelledby="request-dialog-title" @cancel.prevent="close" @close="close" @click="event => { if (event.target === dialog) close(); }" @keydown="event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); send(); } }">
      <div class="request-dialog-content">
        <header class="request-dialog-header"><div><span class="request-eyebrow">{{ model || 'XY API' }}</span><h2 id="request-dialog-title">{{ title }}</h2></div><button class="request-close" :aria-label="zh ? '关闭调试' : 'Close playground'" @click="close"><UiIcon name="close" /></button></header>
        <p class="request-execution"><strong>{{ executionLabels[execution][locale] }}</strong> · {{ execution === 'async' ? (zh ? '发送只创建一次任务。随后查询状态，完成后获取结果。' : 'Send creates one task. Query its status, then retrieve the result.') : execution === 'stream' ? (zh ? '事件持续到达；HTTP 200 不等于生成成功。' : 'Events arrive continuously. HTTP 200 does not mean generation succeeded.') : (zh ? '发送后等待本次请求直接返回结果。' : 'Wait for this request to return its result directly.') }}</p>
        <form ref="form" class="request-address" @submit.prevent="send"><span :class="['method-badge', method]">{{ method.toUpperCase() }}</span><code>{{ preview?.url || spec.servers[0].url + endpoint }}</code><button v-if="sending" type="button" class="request-send" @click="abort?.abort()">{{ zh ? '停止接收' : 'Stop' }}</button><button v-else type="submit" class="request-send" :disabled="taskBusy">{{ zh ? '发送' : 'Send' }} <span aria-hidden="true">→</span></button></form>
        <div class="request-mobile-tabs"><button :aria-pressed="activePanel === 'request'" @click="activePanel = 'request'">{{ zh ? '请求参数' : 'Request' }}</button><button :aria-pressed="activePanel === 'response'" @click="activePanel = 'response'">{{ zh ? '示例与响应' : 'Examples & response' }}</button></div>
        <label v-if="modes.length > 1" class="request-execution">{{ zh ? '调用模式' : 'Mode' }} <select :value="currentMode" :disabled="sending || taskBusy" @change="switchMode($event.target.value)"><option v-for="item in modes" :key="item.id" :value="item.id">{{ item.title[locale] }}</option></select></label>
        <div class="request-dialog-grid">
          <section class="request-input-panel" :class="{ 'mobile-hidden': activePanel !== 'request' }" :aria-label="zh ? '请求参数' : 'Request parameters'">
            <p v-if="description" class="request-operation-description">{{ description }}</p>
            <fieldset class="request-auth"><legend>{{ zh ? '鉴权' : 'Authorization' }}</legend><label for="request-api-key">API Key <span class="request-required">{{ zh ? '必填' : 'required' }}</span></label><div class="request-key-input"><input id="request-api-key" v-model="key" :type="showKey ? 'text' : 'password'" autocomplete="off" spellcheck="false" placeholder="sk-…" /><button type="button" :aria-pressed="showKey" @click="showKey = !showKey">{{ showKey ? (zh ? '隐藏' : 'Hide') : (zh ? '显示' : 'Show') }}</button></div><p>{{ zh ? '填写自己的 API Key，自动添加 Bearer。仅在本页内存中保留。' : 'Enter your API key. Bearer is added automatically. Kept only in page memory.' }}</p></fieldset>
            <div v-if="hasBody && mediaType === 'application/json'" class="request-editor-tabs"><button :aria-pressed="editor === 'form'" @click="switchEditor('form')">{{ zh ? '参数表单' : 'Form' }}</button><button :aria-pressed="editor === 'json'" @click="switchEditor('json')">JSON</button></div>
            <JsonForms v-show="editor === 'form'" class="request-schema-form" :data="data" :schema="definition.schema" :uischema="definition.uischema" :renderers="renderers" :ajv="ajv" :config="{ showUnfocusedDescription: true, locale }" :validation-mode="validationMode" @change="changeForm" />
            <div v-if="editor === 'json'" class="request-json-editor"><label for="request-json">{{ zh ? '请求体 · JSON' : 'Request body · JSON' }}</label><textarea id="request-json" :value="draft" spellcheck="false" @input="editJson($event.target.value)" /><p v-if="rawError" role="alert">{{ rawError }}</p><p>{{ zh ? '编辑 JSON 后，可切回参数表单查看各项说明。' : 'Switch back to the form to see parameter descriptions.' }}</p></div>
            <p v-if="error" class="request-error" role="alert">{{ error }}</p>
            <p v-if="validationMode === 'ValidateAndShow' && formErrors.length" class="request-error">{{ formErrors.map(item => `${item.instancePath || '/'}: ${item.message}`).join('\n') }}</p>
          </section>
          <section class="request-result-panel" :class="{ 'mobile-hidden': activePanel !== 'response' }" :aria-label="zh ? '示例与响应' : 'Examples and response'">
            <div v-if="task" class="request-task"><strong>{{ zh ? '异步任务' : 'Async task' }} · {{ task.status }}</strong><code>{{ task.id }}</code><p>{{ task.failed ? (zh ? '任务失败，请查看实际响应中的错误。' : 'Task failed. Inspect the response error.') : task.complete ? (zh ? '任务已完成，可以获取结果。' : 'Task completed. Retrieve the result.') : (zh ? '提交成功，生成尚未完成。查询不会再次提交生成请求。' : 'Accepted; generation is not complete. Querying does not resubmit generation.') }}</p><div><button :disabled="taskBusy || sending" @click="queryTask">{{ taskBusy ? (zh ? '处理中…' : 'Working…') : (zh ? '查询状态' : 'Query status') }}</button><button v-if="!task.complete && !task.failed" :disabled="sending" @click="toggleQuery">{{ autoQuery ? (zh ? '停止自动查询' : 'Stop querying') : (zh ? '自动查询 · 每 3 秒' : 'Auto query · every 3 seconds') }}</button><button v-if="task.complete && taskProtocol.download" :disabled="taskBusy" @click="downloadTask">{{ zh ? '获取结果并预览' : 'Retrieve and preview result' }}</button></div></div>
            <details :open="!actualResponse"><summary class="request-panel-title">{{ zh ? '请求代码' : 'Request code' }}<span>{{ zh ? '随参数更新' : 'Updates with parameters' }}</span></summary><CodeExample :codes="codes" /></details>
            <div class="request-panel-title response-title"><span>{{ actualResponse ? (zh ? '实际响应' : 'Actual response') : (zh ? '响应示例' : 'Response example') }}</span><span v-if="actualResponse" :class="{ 'request-http-error': actualResponse.status >= 400 }">{{ actualResponse.status }} · {{ actualResponse.duration }} ms</span><span v-else>{{ responseStatus }} · {{ sampleType }}</span></div>
            <template v-if="actualResponse"><div class="request-response-tabs"><button :aria-pressed="responseTab === 'body'" @click="responseTab = 'body'">{{ zh ? '响应体' : 'Body' }}</button><button v-if="actualResponse.type === 'text/event-stream'" :aria-pressed="responseTab === 'events'" @click="responseTab = 'events'">{{ zh ? '流式事件' : 'Stream events' }} ({{ actualResponse.events.length }})</button><button :aria-pressed="responseTab === 'headers'" @click="responseTab = 'headers'">{{ zh ? '响应头' : 'Headers' }}</button><span v-if="sending" role="status">{{ zh ? '接收中…' : 'Receiving…' }}</span></div><div v-if="responseTab === 'events'" class="request-stream-events"><p role="status">{{ actualResponse.streamState === 'completed' ? (zh ? '已收到完成事件' : 'Completion event received') : actualResponse.streamState === 'failed' ? (zh ? '已收到错误事件，生成失败' : 'Error event received') : actualResponse.streamState === 'receiving' ? (zh ? '流连接接收中' : 'Receiving stream') : (zh ? '连接已结束，但未收到已声明的完成或错误事件。' : 'Stream closed without a declared completion or error event.') }}</p><article v-for="(event, index) in actualResponse.events" :key="index"><strong>{{ index + 1 }} · {{ event.event }}</strong><pre>{{ event.data }}</pre></article></div><CodeExample v-else-if="responseTab === 'headers'" :codes="{ json: JSON.stringify(actualResponse.headers, null, 2) }" /><div v-else-if="actualResponse.url" class="request-media-result"><audio v-if="actualResponse.type.startsWith('audio/')" :src="actualResponse.url" controls /><video v-else-if="actualResponse.type.startsWith('video/')" :src="actualResponse.url" controls /><img v-else-if="actualResponse.type.startsWith('image/')" :src="actualResponse.url" :alt="zh ? '接口返回的图片' : 'Returned image'" /><p>{{ actualResponse.type }} · {{ actualResponse.bytes }} B</p><a :href="actualResponse.url" :download="actualResponse.filename">{{ zh ? '下载文件' : 'Download file' }} ↓</a></div><pre v-else class="request-live-response"><code>{{ actualResponse.text || (method === 'head' ? (zh ? 'HEAD 请求不返回响应体，请查看响应头。' : 'HEAD returns headers only.') : (zh ? '响应体为空。' : 'Empty response body.')) }}</code></pre></template>
            <CodeExample v-else-if="sampleCodes" :codes="sampleCodes" /><p v-else class="request-empty-response">{{ zh ? '此模式没有公开响应示例。发送请求后将在这里显示实际响应。' : 'No response example for this mode. Send a request to see the actual response.' }}</p>
          </section>
        </div>
        <footer class="request-dialog-footer"><span>{{ zh ? '生成请求正常计费。关闭或停止接收不会撤销已提交的任务。' : 'Generation is billed normally. Closing or stopping reception does not revoke a submitted task.' }}</span><span class="request-shortcut">Ctrl / ⌘ + Enter</span></footer>
      </div>
    </dialog>
  </Teleport>
</template>
