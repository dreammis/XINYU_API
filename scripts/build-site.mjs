import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { methods, publicPath, sha256 } from './docs-contract.mjs';
import { modelOperations } from '../site/.vitepress/theme/openapi-content.mjs';
import { publicApiMarkdown } from './public-api-markdown.mjs';

const root = path.resolve(process.env.DOCS_ROOT ?? fileURLToPath(new URL('..', import.meta.url)));
const book = path.join(root, 'gitbook');
const site = path.join(root, 'site');
const files = JSON.parse(await readFile(path.join(book, '.generated.json'), 'utf8'));
const registry = JSON.parse(await readFile(path.join(root, 'sources.json'), 'utf8'));
const series = JSON.parse(await readFile(path.join(root, 'content/series.json'), 'utf8'));
const translations = JSON.parse(await readFile(path.join(root, 'content/openapi-zh.json'), 'utf8'));
const generated = new Map();
const sidebar = {};
const endpoints = [];
const contracts = {};
const capabilities = [];
const publicPages = new Map();

// Vue 属性与导航 HTML 的文本必须转义；公开调用名可以包含斜线等字符。
function html(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// 从已校验快照生成展示数据；公开规范与代理允许列表不受展示改版影响。
for (const source of registry.sources) {
  const manifest = JSON.parse(await readFile(path.join(root, 'catalog', source.id, 'public-docs.json'), 'utf8'));
  const spec = JSON.parse(await readFile(path.join(book, `openapi/${source.id}.json`), 'utf8'));
  const category = manifest.category ?? source.category ?? 'other';
  if (!series[category]) throw new Error(`Unknown series: ${category}`);
  const operations = Object.entries(spec.paths).flatMap(([endpoint, item]) => methods.filter((method) => item[method]).map((method) => ({
    endpoint, method, id: item[method].operationId,
    slug: item[method].operationId.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(),
    title: { zh: item[method]['x-title-zh'] ?? item[method].summary, en: item[method].summary },
  })));
  const models = (manifest.models ?? []).map((name) => ({
    name,
    slug: /^[a-zA-Z0-9._-]+$/.test(name) ? name : `${name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60)}-${sha256(name).slice(0, 8)}`,
    title: manifest.modelDetails?.[name]?.title,
    summary: manifest.modelDetails?.[name]?.summary,
    group: manifest.modelDetails?.[name]?.group,
    operations: manifest.modelDetails?.[name]?.operations,
  }));
  if (source.modelNotes?.some(note => note.models.some(name => !models.some(model => model.name === name)))) throw new Error(`${source.id}: model note points to an unknown model`);
  const displaySpec = structuredClone(spec);
  // 旧规范缺失的中文说明采用逐条人工翻译；源契约的中文始终优先，下载规范保持原样。
  function localize(value) {
    if (!value || typeof value !== 'object') return;
    if (value.description && !value['x-description-zh'] && translations[value.description]) value['x-description-zh'] = translations[value.description];
    Object.values(value).forEach(localize);
  }
  localize(displaySpec);
  contracts[source.id] = displaySpec;
  capabilities.push({ id: source.id, title: manifest.title, category, version: manifest.version, models, operations });
}

// 保留 Markdown 导出和既有 URL，站点接口页只由同一份规范渲染一次。
for (const filename of files) {
  publicPath(filename);
  const original = await readFile(path.join(book, filename), 'utf8');
  if (filename.startsWith('openapi/')) {
    generated.set(`public/${filename}`, original);
    const spec = JSON.parse(original);
    for (const server of spec.servers) {
      const base = new URL(server.url);
      if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error(`Invalid API server: ${server.url}`);
      for (const [endpoint, item] of Object.entries(spec.paths)) {
        for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head']) {
          if (item[method]) endpoints.push({ origin: base.origin, path: `${base.pathname.replace(/\/$/, '')}${endpoint}`, method: method.toUpperCase() });
        }
      }
    }
    continue;
  }
  if (!filename.endsWith('.md') || filename.endsWith('/SUMMARY.md')) continue;
  const locale = filename.split('/')[0];
  let content = original.replaceAll(/\]\(([^)]+)\)/g, (match, href) => {
    if (href.startsWith('https://raw.githubusercontent.com/') && href.includes('/gitbook/openapi/')) return `](/openapi/${href.split('/').at(-1).split('?')[0]})`;
    return `](${href.replace(/(^|\/)README\.md(?=#|$)/, '$1index.md')})`;
  });
  const interactive = /{% openapi src="([^"]+)" path="([^"]+)" method="([^"]+)" %}/.exec(content);
  if (interactive) {
    const id = new URL(interactive[1]).pathname.split('/').at(-1).replace(/\.json$/, '');
    const title = content.split('\n').find((line) => line.startsWith('# ')).slice(2);
    publicPages.set(filename, publicApiMarkdown(contracts[id], interactive[2], interactive[3], locale));
    content = `---\naside: false\noutline: false\npageClass: api-page\n---\n\n# ${title}\n\n<ApiPlayground spec="/openapi/${id}.json" endpoint="${interactive[2]}" method="${interactive[3]}" locale="${locale}" />\n`;
  } else {
    content = content.replaceAll(/{% content-ref url="([^"]+)" %}\s*\[[^\]]+\]\([^)]*\)\s*{% endcontent-ref %}/g, (_, href) => `[${href === 'quickstart.md' ? 'Quickstart' : 'Capabilities'}](${href})`);
  }
  if (content.includes('{%')) throw new Error(`Unsupported GitBook block: ${filename}`);
  if (!interactive) publicPages.set(filename.replace(/(^|\/)README\.md$/, '$1index.md'), content);
  generated.set(filename.replace(/(^|\/)README\.md$/, '$1index.md'), content);
}

for (const locale of ['zh', 'en']) {
  const zh = locale === 'zh';
  const apiGroups = [{ text: zh ? 'API 手册' : 'API manual', items: [
    { text: zh ? '概览' : 'Overview', link: `/${locale}/` },
    { text: zh ? '全部系列' : 'All series', link: `/${locale}/capabilities` },
    { text: zh ? '模型中心' : 'Model center', link: `/${locale}/models` },
  ] }];
  for (const [category, info] of Object.entries(series)) {
    const matching = capabilities.filter((capability) => capability.category === category);
    if (!matching.length) continue;
    const items = [];
    for (const capability of matching) {
      const base = `/${locale}/api-reference/${capability.id}`;
      items.push({ text: matching.length > 1 ? capability.title[locale] : (zh ? '总览与模型选择' : 'Overview and models'), link: `${base}/` });
      items.push({ text: zh ? '使用流程与限制' : 'Usage and limits', link: `/${locale}/guides/${capability.id}` });
      for (const operation of capability.operations) items.push({ text: `<span class="nav-method ${operation.method}">${operation.method.toUpperCase()}</span>${html(operation.title[locale])}`, link: `${base}/${operation.slug}` });
      // 调用名称进入 API 手册；同一规范可按模型生成入口，不复制接口定义。
      const modelItems = capability.models.map(model => ({ text: html(model.title?.[locale] ?? model.name), link: `/${locale}/models/${capability.id}/${model.slug}`, collapsed: true, items: modelOperations(contracts[capability.id], model.name).filter(item => !model.operations || model.operations.includes(item.operation.operationId)).map(item => {
        const operation = capability.operations.find(operation => operation.id === item.operation.operationId);
        return { text: `<span class="nav-method ${operation.method}">${operation.method.toUpperCase()}</span>${html(operation.title[locale])}`, link: `${base}/models/${model.slug}/${operation.slug}` };
      }) }));
      const grouped = new Map();
      for (let index = 0; index < capability.models.length; index++) {
        const group = capability.models[index].group;
        if (!group) items.push(modelItems[index]);
        else {
          if (!grouped.has(group)) { const entry = { text: html(group), collapsed: true, items: [] }; grouped.set(group, entry); items.push(entry); }
          grouped.get(group).items.push(modelItems[index]);
        }
      }
    }
    apiGroups.push({ text: info.title[locale], collapsed: true, items });
  }
  const guideGroup = { text: zh ? '接入指南' : 'Integration', items: [
    { text: zh ? '接入概览' : 'Integration overview', link: `/${locale}/integration` },
    { text: zh ? '快速开始' : 'Quickstart', link: `/${locale}/quickstart` },
    { text: zh ? '鉴权与 API Key' : 'Authentication', link: `/${locale}/authentication` },
    { text: zh ? '计费规则' : 'Billing', link: `/${locale}/billing` },
  ] };
  const helpGroup = { text: zh ? '常见问题' : 'Help', items: [
    { text: zh ? '常见问题' : 'FAQ', link: `/${locale}/faq` },
    { text: zh ? '错误与任务恢复' : 'Errors and recovery', link: `/${locale}/errors` },
  ] };
  sidebar[`/${locale}/`] = [...apiGroups, guideGroup, helpGroup];
  for (const capability of capabilities) {
    const active = apiGroups.map((group) => ({ ...group, collapsed: group.items.some((item) => item.link?.includes(`/${capability.id}`)) ? false : group.collapsed }));
    sidebar[`/${locale}/api-reference/${capability.id}/`] = active;
    sidebar[`/${locale}/guides/${capability.id}`] = active;
    const overview = ['---', 'aside: false', 'pageClass: series-page', '---', '', `# ${series[capability.category].title[locale]}${capabilities.filter((item) => item.category === capability.category).length > 1 ? ` · ${capability.title[locale]}` : ''}`, '', `<SeriesOverview id="${capability.id}" locale="${locale}" />`, ''];
    const source = registry.sources.find((item) => item.id === capability.id);
    const guide = await readFile(path.join(book, locale, 'guides', `${capability.id}.md`), 'utf8');
    // 模型对照直接摘录公开指南的指定章节；章节改名必须显式更新登记。
    const selection = [];
    for (const heading of source.selectionSections?.[locale] ?? []) {
      const section = guide.split(/(?=^## )/m).find((item) => item.split(/\r?\n/)[0] === `## ${heading}`);
      if (!section) throw new Error(`${capability.id}: missing selection section ${locale}/${heading}`);
      overview.push(section.trim(), '');
      selection.push(section.trim());
    }
    overview.push(`[${zh ? '完整使用流程、参数与限制 →' : 'Full usage guide and limits →'}](../../guides/${capability.id}.md)`, '');
    generated.set(`${locale}/api-reference/${capability.id}/index.md`, overview.join('\n'));
    publicPages.set(`${locale}/api-reference/${capability.id}/index.md`, [`# ${series[capability.category].title[locale]}`, ...selection, `[${zh ? '使用指南' : 'Usage guide'}](/${locale}/guides/${capability.id})`, ...capability.operations.map(operation => `- [${operation.title[locale]}](/${locale}/api-reference/${capability.id}/${operation.slug})`)].join('\n\n'));
    for (const model of capability.models) {
      // 模型事实直接抽取源指南表格的本模型行；说明段落通过来源指针摘录，改名/缺失立即失败。
      const facts = [];
      for (const section of selection) {
        for (const table of section.matchAll(/(?:^\|.*\|\r?\n){2,}(?:^\|.*\|(?:\r?\n|$))?/gm)) {
          const rows = table[0].trim().split(/\r?\n/).map(line => line.split('|').slice(1, -1).map(cell => cell.trim().replaceAll('`', '')));
          const row = rows.slice(2).find(row => row[0] === model.name);
          if (row) row.slice(1).forEach((value, index) => facts.push({ label: rows[0][index + 1], value }));
        }
      }
      model.facts ??= {};
      model.facts[locale] = facts;
      model.notes ??= {};
      model.notes[locale] = [];
      for (const note of source.modelNotes ?? []) {
        if (!note.models.includes(model.name)) continue;
        const paragraphs = guide.replaceAll('\r\n', '\n').split(/\n\s*\n/).filter(paragraph => paragraph.includes(note.contains[locale]));
        if (paragraphs.length !== 1) throw new Error(`${capability.id}: model note must match exactly one paragraph ${locale}/${note.contains[locale]}`);
        if (!model.notes[locale].includes(paragraphs[0])) model.notes[locale].push(paragraphs[0]);
      }
      const modelPath = `${locale}/models/${capability.id}/${model.slug}.md`;
      const intro = model.summary?.[locale] ?? (zh ? '本站公开调用名称。可用性取决于账户权限与服务状态。' : 'A public product route. Availability depends on account permissions and service status.');
      const notes = model.notes[locale].length ? `\n## ${zh ? '模型说明' : 'Model notes'}\n\n${model.notes[locale].join('\n\n')}\n` : '';
      generated.set(modelPath, `---\naside: false\npageClass: model-page\n---\n\n# ${html(model.title?.[locale] ?? model.name)}\n\n${intro}\n\n<ModelDetail id="${capability.id}" model="${html(model.name)}" locale="${locale}">\n${notes}\n</ModelDetail>\n`);
      const links = [];
      for (const item of modelOperations(contracts[capability.id], model.name).filter(item => !model.operations || model.operations.includes(item.operation.operationId))) {
        const operation = capability.operations.find(operation => operation.id === item.operation.operationId);
        const destination = `${locale}/api-reference/${capability.id}/models/${model.slug}/${operation.slug}.md`;
        generated.set(destination, `---\naside: false\noutline: false\npageClass: api-page\n---\n\n# ${html(operation.title[locale])} · ${html(model.name)}\n\n<ApiPlayground spec="/openapi/${capability.id}.json" endpoint="${operation.endpoint}" method="${operation.method}" model="${html(model.name)}" locale="${locale}" />\n`);
        publicPages.set(destination, publicApiMarkdown(contracts[capability.id], operation.endpoint, operation.method, locale, model.name));
        links.push(`- [${operation.title[locale]}](/${destination.replace(/\.md$/, '')})`);
      }
      publicPages.set(modelPath, [`# ${model.name}`, intro, `## ${zh ? '模型能力' : 'Model capabilities'}`, ...facts.map(fact => `- ${fact.label}: ${fact.value}`), notes, `## ${zh ? '适用接口' : 'Supported APIs'}`, ...links].join('\n\n'));
      // 最长前缀配置保留当前模型展开，其他模型与系列保持折叠。
      const modelSidebar = structuredClone(active);
      function expand(items) {
        return items.some(item => {
          const child = item.items ? expand(item.items) : false;
          const match = item.link === `/${locale}/models/${capability.id}/${model.slug}` || child;
          if (match && item.collapsed !== undefined) item.collapsed = false;
          return match;
        });
      }
      // some 会短路，需遍历所有顶层；展开逻辑只影响当前链路。
      modelSidebar.forEach(group => { if (expand(group.items) && group.collapsed !== undefined) group.collapsed = false; });
      sidebar[`/${locale}/api-reference/${capability.id}/models/${model.slug}/`] = modelSidebar;
      sidebar[`/${locale}/models/${capability.id}/${model.slug}`] = modelSidebar;
    }
  }
  for (const page of ['integration', 'quickstart', 'authentication', 'billing']) sidebar[`/${locale}/${page}`] = [guideGroup, helpGroup];
  for (const page of ['faq', 'errors']) sidebar[`/${locale}/${page}`] = [helpGroup, guideGroup];
  const modelGroups = [{ text: zh ? '模型中心' : 'Model center', items: [{ text: zh ? '全部模型' : 'All models', link: `/${locale}/models` }] }];
  for (const capability of capabilities.filter((item) => item.models.length)) {
    modelGroups.push({ text: series[capability.category].title[locale], collapsed: false, items: capability.models.map((model) => ({ text: html(model.title?.[locale] ?? model.name), link: `/${locale}/models/${capability.id}/${model.slug}` })) });
  }
  sidebar[`/${locale}/models`] = modelGroups;
  // 模型中心的总目录按系列折叠，详情沿用 API 手册中的模型上下文。
  modelGroups.slice(1).forEach(group => { group.collapsed = true; });
  generated.set(`${locale}/index.md`, `---\ntitle: ${zh ? 'XY API 开发者文档' : 'XY API Developer documentation'}\naside: false\npageClass: home-page\n---\n\n<DocsHome locale="${locale}" />\n`);
  publicPages.set(`${locale}/index.md`, [`# XY API · ${zh ? '图像与视频 API' : 'Image and video APIs'}`, zh ? '统一客户入口与计费，支持图片生成、参考图编辑和异步视频任务。' : 'One customer gateway and billing system for image generation, reference editing and asynchronous video tasks.', ...capabilities.flatMap(capability => capability.operations.map(operation => `- [${operation.title[locale]}](/${locale}/api-reference/${capability.id}/${operation.slug})`)), `[${zh ? '快速开始' : 'Quickstart'}](/${locale}/quickstart)`, `[${zh ? '鉴权' : 'Authentication'}](/${locale}/authentication)`].join('\n\n'));
  generated.set(`${locale}/capabilities.md`, `---\naside: false\n---\n\n# ${zh ? '全部系列' : 'All series'}\n\n${zh ? '按任务选择能力。正式接口仅展示已发布的公开契约。' : 'Choose a capability by task. Only published public contracts provide API links.'}\n\n<CapabilityGrid locale="${locale}" :show-pending="true" />\n`);
  const modelLinks = capabilities.flatMap((capability) => capability.models.map((model) => `- [${model.name}](models/${capability.id}/${model.slug}.md)`));
  generated.set(`${locale}/models.md`, `---\naside: false\npageClass: models-page\n---\n\n# ${zh ? '模型中心' : 'Model center'}\n\n${zh ? '按能力筛选公开调用名称，再查看模型差异与调用入口。名称不保证原厂直连或精确模型快照。' : 'Filter public routes by capability, then compare limits and find the API. Names do not guarantee original-provider access or a precise model snapshot.'}\n\n<ModelCatalog locale="${locale}" />\n\n<details class="model-search-index"><summary>${zh ? '全部模型链接' : 'All model links'}</summary>\n\n${modelLinks.join('\n')}\n\n</details>\n`);
}

// 公开 Markdown 与 llms.txt 只枚举客户页面；内部 SOP、来源路径和交接记录不进入站点。
for (const [filename, content] of publicPages) {
  const rewritten = content.replaceAll(/\]\(([^)]+)\)/g, (match, href) => {
    if (/^[a-z]+:|^\/|^#/i.test(href)) return match;
    const [target, anchor] = href.split('#');
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(filename), target)).replace(/(^|\/)README\.md$/, '$1index.md');
    return `](/${resolved.replace(/(?:index)?\.md$/, '')}${anchor ? `#${anchor}` : ''})`;
  });
  generated.set(`public/markdown/${filename}`, rewritten);
}
generated.set('public/llms.txt', '# XY API\n\n> Customer API documentation. Authenticate with a customer Bearer key at https://openai.2yanx.dpdns.org. Generation is billed. Model route names are site products.\n\n## Documentation\n\n' + [...publicPages].map(([filename, content]) => `- [${content.match(/^# (.+)/m)?.[1] ?? filename}](https://xyapi-docs.pages.dev/markdown/${filename})`).join('\n') + '\n\n## OpenAPI\n\n' + capabilities.map(item => `- [${item.title.en}](https://xyapi-docs.pages.dev/openapi/${item.id}.json)`).join('\n') + '\n');

// VitePress 对同层前缀使用配置顺序，先放较长路径，避免 /zh/ 抢占 /zh/models.md。
generated.set('.vitepress/sidebar.json', JSON.stringify(Object.fromEntries(Object.entries(sidebar).sort(([left], [right]) => right.length - left.length)), null, 2) + '\n');
generated.set('.vitepress/catalog.json', JSON.stringify({ series, capabilities }, null, 2) + '\n');
generated.set('.vitepress/contracts.json', JSON.stringify(contracts) + '\n');
generated.set('public-endpoints.mjs', '// 自动从公开 OpenAPI 生成；不手动修改。\nexport default ' + JSON.stringify(endpoints, null, 2) + ';\n');

// 新模型页和普通 Markdown 链接也在写入前校验。
for (const [filename, content] of generated) {
  if (!filename.endsWith('.md')) continue;
  for (const match of content.replace(/```[\s\S]*?```/g, '').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].split('#')[0];
    if (!href || /^[a-z]+:|^\//i.test(href)) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(filename), href));
    if (!generated.has(target)) throw new Error(`Broken site link: ${filename} -> ${href}`);
  }
}
const manifestPath = path.join(site, '.generated.json');
let previous = [];
try { previous = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const filename of previous.filter((name) => !generated.has(name))) await rm(path.join(site, publicPath(filename)));
for (const [filename, content] of generated) {
  const destination = path.join(site, publicPath(filename));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content);
}
await writeFile(manifestPath, JSON.stringify([...generated.keys()].sort(), null, 2) + '\n');
console.log(`Prepared ${generated.size} site files, ${capabilities.reduce((count, item) => count + item.models.length, 0)} model pages and ${endpoints.length} public debug endpoints.`);
