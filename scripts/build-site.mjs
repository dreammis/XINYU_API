import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicPath } from './docs-contract.mjs';

const root = path.resolve(process.env.DOCS_ROOT ?? fileURLToPath(new URL('..', import.meta.url)));
const book = path.join(root, 'gitbook');
const site = path.join(root, 'site');
const files = JSON.parse(await readFile(path.join(book, '.generated.json'), 'utf8'));
const generated = new Map();
const sidebar = {};
const endpoints = [];

// 复用同一份已校验的 Markdown/OpenAPI，托管平台变化不产生第二份接口契约。
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
  const zh = locale === 'zh';
  let content = original.replaceAll(/\]\(([^)]+)\)/g, (match, href) => {
    if (href.startsWith('https://raw.githubusercontent.com/') && href.includes('/gitbook/openapi/')) return `](/openapi/${href.split('/').at(-1).split('?')[0]})`;
    return `](${href.replace(/(^|\/)README\.md(?=#|$)/, '$1index.md')})`;
  });
  content = content.replaceAll(/{% content-ref url="([^"]+)" %}\s*\[[^\]]+\]\([^)]*\)\s*{% endcontent-ref %}/g, (_, href) => {
    const title = href === 'quickstart.md' ? (zh ? '快速开始 →' : 'Quickstart →') : (zh ? '浏览所有能力 →' : 'Explore capabilities →');
    return `<a class="xy-doc-link" href="${href.replace(/\.md$/, '')}">${title}</a>`;
  });
  let interactive = false;
  content = content.replaceAll(/{% openapi src="([^"]+)" path="([^"]+)" method="([^"]+)" %}[\s\S]*?{% endopenapi %}/g, (_, src, endpoint, method) => {
    interactive = true;
    const spec = `/openapi/${new URL(src).pathname.split('/').at(-1)}`;
    return `## ${zh ? '在线调试' : 'Try this endpoint'}\n\n${zh ? '填写自己的 API Key 和请求参数后发送。生成请求会正常计费；Key 仅用于本次调试，不保存到浏览器。' : 'Enter your API key and request parameters, then send. Generation requests are billed normally; authentication is not persisted in your browser.'}\n\n<ApiPlayground spec="${spec}" endpoint="${endpoint}" method="${method}" locale="${locale}" />`;
  });
  if (content.includes('{%')) throw new Error(`Unsupported GitBook block: ${filename}`);
  if (interactive) content = `---\naside: false\n---\n\n${content}`;
  generated.set(filename.replace(/(^|\/)README\.md$/, '$1index.md'), content);
}

// SUMMARY 是唯一目录来源，新能力注册后自动出现在两个语言的导航中。
for (const locale of ['zh', 'en']) {
  const summary = await readFile(path.join(book, locale, 'SUMMARY.md'), 'utf8');
  const groups = [];
  let group;
  let parent;
  for (const line of summary.split('\n')) {
    if (line.startsWith('## ')) {
      group = { text: line.slice(3), items: [] };
      groups.push(group);
      parent = undefined;
      continue;
    }
    const match = /^(\s*)\* \[([^\]]+)\]\(([^)]+)\)$/.exec(line);
    if (!match) continue;
    if (!group) throw new Error(`Navigation entry without a group: ${line}`);
    const slug = match[3].replace(/(^|\/)README\.md$/, '$1index.md').replace(/\.md$/, '').replace(/(^|\/)index$/, '$1');
    const entry = { text: match[2], link: `/${locale}/${slug}` };
    if (match[1]) {
      if (!parent) throw new Error(`Navigation child without a parent: ${line}`);
      (parent.items ??= []).push(entry);
    } else {
      group.items.push(entry);
      parent = entry;
    }
  }
  sidebar[`/${locale}/`] = groups;
}
generated.set('.vitepress/sidebar.json', JSON.stringify(sidebar, null, 2) + '\n');

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
await mkdir(path.join(root, 'functions'), { recursive: true });
await writeFile(path.join(root, 'functions/public-endpoints.json'), JSON.stringify(endpoints, null, 2) + '\n');
console.log(`Prepared ${generated.size} site files and ${endpoints.length} public debug endpoints.`);
