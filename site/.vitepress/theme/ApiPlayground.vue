<script setup>
import UiIcon from './UiIcon.vue';
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import contracts from '../contracts.json';
import catalog from '../catalog.json';
import CodeExample from './CodeExample.vue';
import VoiceBrowser from './VoiceBrowser.vue';
import { executionMode, executionLabels } from './execution-mode.mjs';
import SchemaFields from './SchemaFields.vue';
import { parameterDescription, schemaConstraints } from './schema-presentation.mjs';
import { useRouter } from 'vitepress';
import { operationExamples, requestCode, resolveSchema, responseExampleFor } from './openapi-content.mjs';

const props = defineProps({ spec: String, endpoint: String, method: String, locale: String, model: String });
const router = useRouter();
const id = computed(() => props.spec.split('/').at(-1).replace(/\.json$/, ''));
const specification = computed(() => contracts[id.value]);
const operation = computed(() => specification.value.paths[props.endpoint][props.method]);
const capability = computed(() => catalog.capabilities.find(item => item.id === id.value));
// 共享任务操作来自生成器的契约分类；下载页额外提供同一文件的 HEAD 检查入口。
const relatedOperations = computed(() => capability.value.sharedOperations.filter(item => item.id !== operation.value.operationId && (item.method !== 'head' || item.endpoint === props.endpoint)));
const bodyTypes = computed(() => Object.keys(operation.value.requestBody?.content ?? {}));
const mediaType = ref(bodyTypes.value[0] ?? 'application/json');
const body = computed(() => operation.value.requestBody?.content?.[mediaType.value]);
const selectedModel = computed(() => props.model ?? (modelEnum.value.includes(body.value?.example?.model) ? body.value.example.model : modelEnum.value[0]));
const modes = computed(() => operationExamples(specification.value, operation.value, mediaType.value, selectedModel.value));
const mode = ref('json');
const progress = ref(false);
const selectedVoice = ref('');
const activeMode = computed(() => modes.value.find(item => item.id === mode.value) ?? modes.value[0]);
const example = computed(() => {
  const value = progress.value && activeMode.value.example?.stream ? { ...activeMode.value.example, progress: true } : activeMode.value.example;
  return selectedVoice.value && id.value === 'media-tts' ? {...value, voice: selectedVoice.value} : value;
});
const execution = computed(() => executionMode(operation.value, example.value));
const codes = computed(() => requestCode({ spec: specification.value, endpoint: props.endpoint, method: props.method, mediaType: mediaType.value, example: example.value }));
const parameters = computed(() => {
  const item = specification.value.paths[props.endpoint];
  const combined = new Map();
  for (const parameter of [...(item.parameters ?? []), ...(operation.value.parameters ?? [])]) combined.set(`${parameter.in}/${parameter.name}`, parameter);
  return [...combined.values()];
});
const statuses = computed(() => Object.keys(operation.value.responses));
const status = ref(statuses.value.find(value => /^2/.test(value)) ?? statuses.value[0]);
const response = computed(() => operation.value.responses[status.value]);
const responseTypes = computed(() => Object.keys(response.value.content ?? {}));
const responseType = computed(() => /^2/.test(status.value) && responseTypes.value.includes(activeMode.value.responseType) ? activeMode.value.responseType : responseTypes.value[0] ?? '');
const responseBody = computed(() => response.value.content?.[responseType.value]);
const responseExample = computed(() => responseExampleFor(operation.value, status.value, responseType.value, example.value));
const modelEnum = computed(() => (resolveSchema(specification.value, resolveSchema(specification.value, body.value?.schema).properties?.model).enum ?? []).filter(name => {
  const detail = capability.value.models.find(model => model.name === name);
  return !detail?.operations || detail.operations.includes(operation.value.operationId);
}));
const requestDialog = shallowRef(null);
const dialogInstance = ref(null);
const clientLoading = ref(false);
const error = ref('');
const endpointStatus = ref('');
// 使用公开规范的服务器地址，保留路径占位符供客户替换。
async function copyEndpoint() {
  try {
    await navigator.clipboard.writeText(specification.value.servers[0].url.replace(/\/$/, '') + props.endpoint);
    endpointStatus.value = props.locale === 'zh' ? '接口地址已复制' : 'Endpoint copied';
  } catch (failure) { endpointStatus.value = `${props.locale === 'zh' ? '复制失败' : 'Copy failed'}: ${failure.message}`; }
}
const mobileCodeOpen = ref(false);
let disposed = false;
watch([mediaType, mode, progress, selectedModel, selectedVoice, operation], () => { error.value = ''; });
watch(mediaType, () => { mode.value = 'json'; progress.value = false; });
watch(operation, () => { mediaType.value = bodyTypes.value[0] ?? 'application/json'; mode.value = 'json'; progress.value = false; status.value = statuses.value.find(value => /^2/.test(value)) ?? statuses.value[0]; });

function selectModel(event) {
  const model = capability.value.models.find(item => item.name === event.target.value);
  const slug = capability.value.operations.find(item => item.id === operation.value.operationId).slug;
  router.go(`/${props.locale}/api-reference/${id.value}/models/${model.slug}/${slug}`);
}

function changeStatus(value) {
  status.value = value;
}

// 表单调试器按需加载；客户凭证仅留在组件内存，页面离开后立即释放。
async function openClient() {
  if (clientLoading.value) return;
  clientLoading.value = true;
  error.value = '';
  try {
    if (!requestDialog.value) {
      const module = await import('./RequestDialog.vue');
      if (disposed) return;
      requestDialog.value = module.default;
      await nextTick();
    }
    await dialogInstance.value.open();
  } catch (failure) { error.value = failure.message; }
  finally { clientLoading.value = false; }
}
onBeforeUnmount(() => { disposed = true; });
</script>

<template>
  <div class="api-playground">
    <nav class="api-section-nav" :aria-label="locale === 'zh' ? '本页章节' : 'On this page'"><a href="#authentication">{{ locale === 'zh' ? '鉴权' : 'Auth' }}</a><a v-if="modelEnum.length" href="#models">{{ locale === 'zh' ? '模型' : 'Model' }}</a><a v-if="parameters.length" href="#parameters">{{ locale === 'zh' ? '路径、查询与请求头' : 'Parameters' }}</a><a v-if="bodyTypes.length" href="#request-body">{{ locale === 'zh' ? '请求参数' : 'Body' }}</a><a href="#responses">{{ locale === 'zh' ? '响应' : 'Responses' }}</a><a href="#examples" @click="mobileCodeOpen = true">{{ locale === 'zh' ? '示例与调试' : 'Examples' }}</a></nav>
    <div class="api-reference-grid">
      <div class="api-document">
        <div class="endpoint-line"><span :class="['method-badge', method]">{{ method.toUpperCase() }}</span><code>{{ endpoint }}</code><button class="endpoint-copy" :aria-label="locale === 'zh' ? '复制接口地址' : 'Copy endpoint URL'" @click="copyEndpoint"><UiIcon name="copy" /></button><button class="endpoint-try" :disabled="clientLoading" @click="openClient">{{ locale === 'zh' ? '试一试' : 'Try it' }}<UiIcon name="external" /></button></div><span class="endpoint-status" role="status">{{ endpointStatus }}</span>
        <p v-if="operation['x-description-zh'] || operation.description" class="api-description">{{ locale === 'zh' ? operation['x-description-zh'] ?? operation.description : operation.description }}</p>
        <p class="field-note"><strong>{{ executionLabels[execution][locale] }}</strong> · {{ execution === 'async' ? (locale === 'zh' ? '先返回任务 ID；在调试面板查询状态，完成后获取结果。' : 'Returns a task ID. Query its status in the playground, then retrieve the result.') : execution === 'stream' ? (locale === 'zh' ? '持续接收事件；最终完成或错误事件决定结果。' : 'Receives events continuously. Check the final completion or error event.') : (locale === 'zh' ? '本次请求等待处理并直接返回 JSON 或文件。' : 'This request waits for processing and returns JSON or a file directly.') }}</p>
        <div class="api-resource-links"><a :href="`/${locale}/api-reference/${id}/`">{{ locale === 'zh' ? '模型选择与限制' : 'Model selection and limits' }} →</a><a :href="`/${locale}/guides/${id}`">{{ locale === 'zh' ? '完整使用流程' : 'Full usage flow' }} →</a></div>
        <h2 id="authentication">{{ locale === 'zh' ? '鉴权' : 'Authentication' }}</h2>
        <p>{{ locale === 'zh' ? '使用客户 API Key。' : 'Use a customer API Key.' }} <a :href="`/${locale}/authentication`">{{ locale === 'zh' ? '获取与配置' : 'Setup' }} →</a></p>
        <div class="auth-example"><code>Authorization: Bearer YOUR_API_KEY</code></div>
        <VoiceBrowser v-if="id === 'media-tts' && method === 'post'" :locale="locale" :model="selectedModel" @select="selectedVoice = $event.id" />
        <template v-if="modelEnum.length"><h2 id="models">{{ locale === 'zh' ? '选择模型' : 'Choose a model' }}</h2><label class="format-select">{{ locale === 'zh' ? '调用名称' : 'Route name' }}<select :aria-label="locale === 'zh' ? '调用名称' : 'Route name'" :value="selectedModel" @change="selectModel"><option v-for="name in modelEnum" :key="name">{{ name }}</option></select></label><a :href="`/${locale}/models/${id}/${capability.models.find(model => model.name === selectedModel).slug}`">{{ locale === 'zh' ? '查看该模型的能力与限制 →' : 'Model capabilities and limits →' }}</a></template>
        <template v-if="parameters.length"><h2 id="parameters">{{ locale === 'zh' ? '路径、查询与请求头' : 'Path, query and header parameters' }}</h2><div v-for="parameter in parameters" :key="`${parameter.in}/${parameter.name}`" class="schema-field"><div class="field-heading"><code>{{ parameter.name }}</code><span class="field-type">{{ parameter.in }} · {{ resolveSchema(specification, parameter.schema).type }}</span><span v-if="parameter.required" class="field-required">{{ locale === 'zh' ? '必填' : 'required' }}</span></div><p>{{ parameterDescription(parameter, locale) }}</p><p v-if="schemaConstraints(resolveSchema(specification, parameter.schema), locale).length" class="field-constraints">{{ schemaConstraints(resolveSchema(specification, parameter.schema), locale).join(' · ') }}</p><p v-if="parameter.example !== undefined" class="field-constraints">{{ locale === 'zh' ? '示例' : 'Example' }}: <code>{{ JSON.stringify(parameter.example) }}</code></p><div v-if="resolveSchema(specification, parameter.schema).enum" class="field-enum"><code v-for="value in resolveSchema(specification, parameter.schema).enum" :key="value">{{ JSON.stringify(value) }}</code></div></div></template>
        <template v-if="bodyTypes.length"><h2 id="request-body">{{ locale === 'zh' ? '请求参数' : 'Request body' }}</h2><label class="format-select">Content-Type <select aria-label="Content-Type" v-model="mediaType"><option v-for="type in bodyTypes" :key="type">{{ type }}</option></select></label><p v-if="resolveSchema(specification, body.schema).description">{{ locale === 'zh' ? resolveSchema(specification, body.schema)['x-description-zh'] ?? resolveSchema(specification, body.schema).description : resolveSchema(specification, body.schema).description }}</p><SchemaFields :spec="specification" :schema="body.schema" :locale="locale" /></template>
        <h2 id="responses">{{ locale === 'zh' ? '响应' : 'Responses' }}</h2>
        <div class="response-statuses" :aria-label="locale === 'zh' ? '响应状态' : 'Response status'"><button v-for="value in statuses" :key="value" :aria-pressed="status === value" @click="changeStatus(value)">{{ value }}</button></div>
        <p>{{ locale === 'zh' ? response['x-description-zh'] ?? response.description : response.description }}</p>
        <template v-if="response.headers"><h3>{{ locale === 'zh' ? '响应头' : 'Response headers' }}</h3><div v-for="(header, name) in response.headers" :key="name" class="schema-field"><div class="field-heading"><code>{{ name }}</code><span class="field-type">{{ resolveSchema(specification, header.schema).type }}</span></div><p>{{ locale === 'zh' ? header['x-description-zh'] ?? header.description : header.description }}</p><p v-if="schemaConstraints(resolveSchema(specification, header.schema), locale).length" class="field-constraints">{{ schemaConstraints(resolveSchema(specification, header.schema), locale).join(' · ') }}</p></div></template>
        <template v-if="responseTypes.length"><p class="format-select">Content-Type <code>{{ responseType }}</code></p><SchemaFields v-if="responseBody?.schema" :spec="specification" :schema="responseBody.schema" :locale="locale" /></template>
        <template v-if="relatedOperations.length"><h3>{{ locale === 'zh' ? '任务查询与结果获取' : 'Task status and results' }}</h3><div class="api-resource-links"><a v-for="item in relatedOperations" :key="item.id" :href="`/${locale}/api-reference/${id}/${item.slug}`">{{ item.title[locale] }} →</a></div></template>
        <div class="api-next"><a :href="`/${locale}/guides/${id}`">{{ locale === 'zh' ? '完整使用流程与限制' : 'Full usage guide and limits' }} →</a><a :href="`/${locale}/billing`">{{ locale === 'zh' ? '计费与退款规则' : 'Billing and refunds' }} →</a><a :href="`/${locale}/errors`">{{ locale === 'zh' ? '错误与任务恢复' : 'Errors and recovery' }} →</a></div>
      </div>
      <aside id="examples" class="api-code-panel" :class="{ 'mobile-expanded': mobileCodeOpen }" :aria-label="locale === 'zh' ? '调用示例与调试' : 'Examples and playground'">
        <button class="mobile-panel-toggle" :aria-expanded="mobileCodeOpen" @click="mobileCodeOpen = !mobileCodeOpen">{{ locale === 'zh' ? '调用示例与在线调试' : 'Examples and playground' }} <span>{{ mobileCodeOpen ? '−' : '+' }}</span></button>
        <div class="api-panel-content">
        <div class="api-panel-heading"><span>{{ locale === 'zh' ? '调用示例' : 'Request example' }}</span><a :href="spec" target="_blank" rel="noreferrer">OpenAPI ↗</a></div>
        <label v-if="modes.length > 1" class="format-select mode-select">{{ locale === 'zh' ? '调用模式' : 'Mode' }}<select :aria-label="locale === 'zh' ? '调用模式' : 'Mode'" v-model="mode"><option v-for="item in modes" :key="item.id" :value="item.id">{{ item.title[locale] }}</option></select></label>
        <label v-if="activeMode.example?.stream && resolveSchema(specification, body?.schema).properties?.progress" class="progress-option"><input v-model="progress" type="checkbox" />{{ locale === 'zh' ? '接收进度事件（本站扩展）' : 'Receive progress events (site extension)' }}</label>
        <p v-if="mode === 'stream' && resolveSchema(specification, body?.schema).properties?.delivery" class="field-note">{{ locale === 'zh' ? '默认流式完成事件包含 Base64；填写 response_format:url 仍返回 Base64。仅 URL 交付请选择另一种模式。' : 'Default SSE completion embeds Base64, even with response_format:url. Choose URL delivery for a URL-only event.' }}</p>
        <CodeExample v-if="!bodyTypes.length || example !== undefined" :codes="codes" />
        <p v-if="bodyTypes.length && example === undefined" class="field-note">{{ locale === 'zh' ? '该格式未提供完整请求示例，请按左侧规范填写请求体。' : 'This format has no complete request example. Build the body using the specification.' }}</p>
        <div class="try-request"><button :disabled="clientLoading" @click="openClient">{{ clientLoading ? (locale === 'zh' ? '正在加载…' : 'Loading…') : (locale === 'zh' ? '试一试这个接口' : 'Try this request') }} <span aria-hidden="true">↗</span></button><p>{{ locale === 'zh' ? '使用自己的 API Key。生成请求正常计费，Key 不持久保存。' : 'Use your own API key. Generation is billed normally. Your key is not persisted.' }}</p><p v-if="error" role="alert">{{ error }}</p></div>
        <div class="api-panel-heading response-example-heading"><span>{{ locale === 'zh' ? '响应示例' : 'Example response' }}</span><span>{{ status }} · {{ responseType }}</span></div>
        <CodeExample v-if="responseExample !== undefined" :codes="{ [typeof responseExample === 'string' ? 'text' : 'json']: typeof responseExample === 'string' ? responseExample : JSON.stringify(responseExample, null, 2) }" :label="locale === 'zh' ? '响应格式' : 'Response format'" />
        <p v-else class="field-note">{{ locale === 'zh' ? '公开契约未提供此模式的完整响应样例，请按左侧响应定义与使用指南处理。' : 'The public contract has no complete response example for this mode. Follow the response schema and usage guide.' }}</p>
        <p v-if="example?.stream" class="field-note">{{ locale === 'zh' ? '等待时会收到心跳；启用进度后还会收到中间事件。HTTP 200 不代表交付成功，请检查最终完成或错误事件。' : 'Expect heartbeats and optional progress events. HTTP 200 is not proof of delivery; check the terminal completion or error event.' }}</p>
        </div>
      </aside>
    </div>
    <component :is="requestDialog" v-if="requestDialog" ref="dialogInstance" :spec="specification" :endpoint="endpoint" :method="method" :media-type="mediaType" :model="selectedModel" :locale="locale" :example="example" :response-example="responseExample" :response-status="status" :response-type="responseType" />
  </div>
</template>
