import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { methods, publicPath, sha256 } from './docs-contract.mjs';

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
    content = `---\naside: false\npageClass: api-page\n---\n\n# ${title}\n\n<ApiPlayground spec="/openapi/${id}.json" endpoint="${interactive[2]}" method="${interactive[3]}" locale="${locale}" />\n`;
  } else {
    content = content.replaceAll(/{% content-ref url="([^"]+)" %}\s*\[[^\]]+\]\([^)]*\)\s*{% endcontent-ref %}/g, (_, href) => `[${href === 'quickstart.md' ? 'Quickstart' : 'Capabilities'}](${href})`);
  }
  if (content.includes('{%')) throw new Error(`Unsupported GitBook block: ${filename}`);
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
    const active = apiGroups.map((group) => ({ ...group, collapsed: group.items.some((item) => item.link.includes(`/${capability.id}`)) ? false : group.collapsed }));
    sidebar[`/${locale}/api-reference/${capability.id}/`] = active;
    sidebar[`/${locale}/guides/${capability.id}`] = active;
    const overview = ['---', 'aside: false', 'pageClass: series-page', '---', '', `# ${series[capability.category].title[locale]}${capabilities.filter((item) => item.category === capability.category).length > 1 ? ` · ${capability.title[locale]}` : ''}`, '', `<SeriesOverview id="${capability.id}" locale="${locale}" />`, ''];
    const source = registry.sources.find((item) => item.id === capability.id);
    const guide = await readFile(path.join(book, locale, 'guides', `${capability.id}.md`), 'utf8');
    // 模型对照直接摘录公开指南的指定章节；章节改名必须显式更新登记。
    for (const heading of source.selectionSections?.[locale] ?? []) {
      const section = guide.split(/(?=^## )/m).find((item) => item.split(/\r?\n/)[0] === `## ${heading}`);
      if (!section) throw new Error(`${capability.id}: missing selection section ${locale}/${heading}`);
      overview.push(section.trim(), '');
    }
    overview.push(`[${zh ? '完整使用流程、参数与限制 →' : 'Full usage guide and limits →'}](../../guides/${capability.id}.md)`, '');
    generated.set(`${locale}/api-reference/${capability.id}/index.md`, overview.join('\n'));
    for (const model of capability.models) {
      generated.set(`${locale}/models/${capability.id}/${model.slug}.md`, `---\naside: false\npageClass: model-page\n---\n\n# ${html(model.title?.[locale] ?? model.name)}\n\n${model.summary?.[locale] ?? (zh ? '本站公开调用名称。可用性取决于账户权限与服务状态。' : 'A public product route. Availability depends on account permissions and service status.')}\n\n<ModelDetail id="${capability.id}" model="${html(model.name)}" locale="${locale}" />\n`);
    }
  }
  for (const page of ['integration', 'quickstart', 'authentication', 'billing']) sidebar[`/${locale}/${page}`] = [guideGroup, helpGroup];
  for (const page of ['faq', 'errors']) sidebar[`/${locale}/${page}`] = [helpGroup, guideGroup];
  const modelGroups = [{ text: zh ? '模型中心' : 'Model center', items: [{ text: zh ? '全部模型' : 'All models', link: `/${locale}/models` }] }];
  for (const capability of capabilities.filter((item) => item.models.length)) {
    modelGroups.push({ text: series[capability.category].title[locale], collapsed: false, items: capability.models.map((model) => ({ text: html(model.title?.[locale] ?? model.name), link: `/${locale}/models/${capability.id}/${model.slug}` })) });
  }
  sidebar[`/${locale}/models`] = modelGroups;
  generated.set(`${locale}/index.md`, `---\ntitle: ${zh ? 'XY API 开发者文档' : 'XY API Developer documentation'}\naside: false\npageClass: home-page\n---\n\n<DocsHome locale="${locale}" />\n`);
  generated.set(`${locale}/capabilities.md`, `---\naside: false\n---\n\n# ${zh ? '全部系列' : 'All series'}\n\n${zh ? '按任务选择能力。正式接口仅展示已发布的公开契约。' : 'Choose a capability by task. Only published public contracts provide API links.'}\n\n<CapabilityGrid locale="${locale}" :show-pending="true" />\n`);
  const modelLinks = capabilities.flatMap((capability) => capability.models.map((model) => `- [${model.name}](models/${capability.id}/${model.slug}.md)`));
  generated.set(`${locale}/models.md`, `---\naside: false\npageClass: models-page\n---\n\n# ${zh ? '模型中心' : 'Model center'}\n\n${zh ? '按能力筛选公开调用名称，再查看模型差异与调用入口。名称不保证原厂直连或精确模型快照。' : 'Filter public routes by capability, then compare limits and find the API. Names do not guarantee original-provider access or a precise model snapshot.'}\n\n<ModelCatalog locale="${locale}" />\n\n<details class="model-search-index"><summary>${zh ? '全部模型链接' : 'All model links'}</summary>\n\n${modelLinks.join('\n')}\n\n</details>\n`);
}

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
