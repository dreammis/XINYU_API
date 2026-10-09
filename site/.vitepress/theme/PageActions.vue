<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useData } from 'vitepress';
import catalog from '../catalog.json';
import UiIcon from './UiIcon.vue';
const { page, lang } = useData();
const zh = computed(() => lang.value.startsWith('zh'));
const markdown = computed(() => `/markdown/${page.value.relativePath}`);
const capability = computed(() => catalog.capabilities.find(item => page.value.relativePath.includes(`/${item.id}/`) || page.value.relativePath.endsWith(`/guides/${item.id}.md`)));
const origin = ref('https://xyapi-docs.pages.dev');
const mcp = computed(() => `${origin.value}/mcp`);
const cursor = computed(() => `cursor://anysphere.cursor-deeplink/mcp/install?name=xyapi-docs&config=${encodeURIComponent(btoa(JSON.stringify({ url: mcp.value })))}`);
const vscode = computed(() => `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: 'xyapi-docs', type: 'http', url: mcp.value }))}`);
const status = ref('');
const copying = ref(false);
const open = ref(false);
const root = ref(null);
const trigger = ref(null);
const menu = ref(null);

// 只复制生成的客户 Markdown；页面中的调试表单与客户 Key 不会进入剪贴板。
async function copyPage() {
  copying.value = true;
  try {
    const response = await fetch(markdown.value);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await navigator.clipboard.writeText(await response.text());
    status.value = zh.value ? '已复制本页 Markdown' : 'Page Markdown copied';
  } catch (failure) { status.value = `${zh.value ? '复制失败' : 'Copy failed'}: ${failure.message}`; }
  finally { copying.value = false; open.value = false; }
}
async function copyText(value, message) {
  try { await navigator.clipboard.writeText(value); status.value = message; }
  catch (failure) { status.value = `${zh.value ? '复制失败' : 'Copy failed'}: ${failure.message}`; }
  open.value = false;
}
const prompt = computed(() => zh.value ? `请先阅读这份 XY API 文档，再回答我的接口接入问题：${origin.value}${markdown.value}` : `Read this XY API documentation and help me integrate the API: ${origin.value}${markdown.value}`);
// 菜单支持方向键、首尾键和 Escape；关闭时焦点回到触发按钮。
async function toggleMenu() {
  open.value = !open.value;
  if (open.value) { await nextTick(); menu.value?.querySelector('[role="menuitem"]')?.focus(); }
}
function menuKeys(event) {
  if (event.key === 'Escape') { open.value = false; trigger.value?.focus(); return; }
  const items = [...menu.value.querySelectorAll('[role="menuitem"]')];
  const index = items.indexOf(document.activeElement);
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
}
function dismiss(event) { if (!root.value?.contains(event.target)) open.value = false; }
onMounted(() => { origin.value = location.origin; document.addEventListener('pointerdown', dismiss); });
onBeforeUnmount(() => document.removeEventListener('pointerdown', dismiss));
watch(() => page.value.relativePath, () => { open.value = false; status.value = ''; });
</script>
<template>
  <div v-if="/^(zh|en)\//.test(page.relativePath)" ref="root" class="page-actions" @focusout="event => { if (!event.currentTarget.contains(event.relatedTarget)) open = false; }">
    <div class="page-action-split"><button :disabled="copying" @click="copyPage"><UiIcon name="copy" />{{ zh ? '复制页面' : 'Copy page' }}</button><button ref="trigger" class="page-action-more" :aria-label="zh ? '更多页面操作' : 'More page actions'" aria-haspopup="menu" :aria-expanded="open" @click="toggleMenu" @keydown.down.prevent="toggleMenu"><UiIcon name="chevron" /></button></div>
    <div v-if="open" ref="menu" class="page-action-menu" role="menu" :aria-label="zh ? '页面操作' : 'Page actions'" @keydown="menuKeys">
      <button role="menuitem" @click="copyPage"><UiIcon name="copy" /><span>{{ zh ? '复制页面' : 'Copy page' }}<small>{{ zh ? '复制本页 Markdown 给 AI' : 'Copy Markdown for AI' }}</small></span></button>
      <a role="menuitem" :href="markdown" target="_blank" rel="noreferrer" @click="open = false"><UiIcon name="code" /><span>{{ zh ? '以 Markdown 格式查看' : 'View as Markdown' }}</span><UiIcon name="external" /></a>
      <button role="menuitem" @click="copyText(origin + '/' + page.relativePath.replace(/(?:index)?\.md$/, ''), zh ? '页面链接已复制' : 'Page URL copied')"><UiIcon name="link" /><span>{{ zh ? '复制页面链接' : 'Copy page URL' }}</span></button>
      <a v-if="capability" role="menuitem" :href="`/openapi/${capability.id}.json`" :download="`${capability.id}.json`" @click="open = false"><UiIcon name="download" /><span>{{ zh ? '下载 OpenAPI 规范' : 'Download OpenAPI' }}</span></a>
      <div class="menu-divider" role="separator" />
      <button role="menuitem" @click="copyText(prompt, zh ? 'AI 阅读提示词已复制，粘贴到你使用的 AI 即可' : 'AI prompt copied; paste it into your AI assistant')"><UiIcon name="sparkles" /><span>{{ zh ? '让 AI 阅读本页' : 'Ask AI about this page' }}<small>{{ zh ? '复制提示词到 ChatGPT / Claude 等' : 'Copy a prompt for ChatGPT / Claude' }}</small></span></button>
      <a role="menuitem" href="/llms.txt" target="_blank" rel="noreferrer" @click="open = false"><UiIcon name="text" /><span>{{ zh ? '查看 AI 文档索引' : 'View AI documentation index' }}</span><UiIcon name="external" /></a>
      <div class="menu-divider" role="separator" />
      <button role="menuitem" @click="copyText(mcp, zh ? 'MCP Server 地址已复制' : 'MCP Server URL copied')"><UiIcon name="plug" /><span>{{ zh ? '复制 MCP Server' : 'Copy MCP Server' }}<small>{{ zh ? '搜索和读取公开接口文档' : 'Search and read public API docs' }}</small></span></button>
      <a role="menuitem" :href="cursor" @click="open = false"><UiIcon name="code" /><span>{{ zh ? '连接到 Cursor' : 'Connect to Cursor' }}</span><UiIcon name="external" /></a>
      <a role="menuitem" :href="vscode" @click="open = false"><UiIcon name="code" /><span>{{ zh ? '连接到 VS Code' : 'Connect to VS Code' }}</span><UiIcon name="external" /></a>
    </div>
    <span class="page-copy-status" role="status" aria-live="polite">{{ status }}</span>
  </div>
</template>
