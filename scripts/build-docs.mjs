import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { locales, methods, publicPath, sha256, validateBundle, validateRegistry } from './docs-contract.mjs';

const root = path.resolve(process.env.DOCS_ROOT ?? fileURLToPath(new URL('..', import.meta.url)));
const output = path.join(root, 'gitbook');
const check = process.argv.includes('--check');
const registry = JSON.parse(await readFile(path.join(root, 'sources.json'), 'utf8'));
validateRegistry(registry);
const navigation = JSON.parse(await readFile(path.join(root, 'content/navigation.json'), 'utf8'));
const bundles = [];
const generated = new Map();

// 构建只依赖已导入快照和公共页；不能在读不到源工程时猜测接口能力。
for (const source of registry.sources) {
  const directory = path.join(root, 'catalog', source.id);
  const manifest = JSON.parse(await readFile(path.join(directory, 'public-docs.json'), 'utf8'));
  if (manifest.id !== source.id) throw new Error(`${source.id}: wrong snapshot`);
  const spec = JSON.parse(await readFile(path.join(directory, 'openapi.json'), 'utf8'));
  const guides = {};
  for (const locale of locales) guides[locale] = await readFile(path.join(directory, `guide.${locale}.md`), 'utf8');
  validateBundle(manifest, spec, guides);
  const provenance = JSON.parse(await readFile(path.join(directory, 'provenance.json'), 'utf8'));
  for (const name of ['public-docs.json', 'openapi.json', 'guide.zh.md', 'guide.en.md']) {
    if (!provenance.hashes?.[name]) throw new Error(`${source.id}: missing provenance hash (${name})`);
  }
  for (const [name, hash] of Object.entries(provenance.hashes)) {
    if (sha256(await readFile(path.join(directory, publicPath(name)), 'utf8')) !== hash) throw new Error(`${source.id}: snapshot changed without import (${name})`);
  }
  const specPath = `openapi/${manifest.id}.json`;
  generated.set(specPath, JSON.stringify(spec, null, 2) + '\n');
  bundles.push({ manifest, spec, guides });
}

for (const locale of locales) {
  const zh = locale === 'zh';
  const commonFiles = await readdir(path.join(root, 'content', locale));
  for (const file of commonFiles.filter((name) => name.endsWith('.md'))) {
    publicPath(file);
    generated.set(`${locale}/${file}`, await readFile(path.join(root, 'content', locale, file), 'utf8'));
  }
  generated.set(`${locale}/.gitbook.yaml`, 'root: ./\nstructure:\n  readme: README.md\n  summary: SUMMARY.md\nredirects:\n  guides: README.md\n  guides/getting-started: quickstart.md\n  guides/authentication: authentication.md\n  guides/model-catalog: models.md\n  guides/pricing: billing.md\n  guides/errors: errors.md\n' + (bundles.some(({ manifest }) => manifest.id === 'media-video') ? '  guides/video-generation: guides/media-video.md\n' : ''));
  const summary = ['# Summary', '', `## ${zh ? '开始使用' : 'Getting started'}`, ''];
  for (const page of navigation) summary.push(`* [${page.title[locale]}](${publicPath(page.file)})`);
  summary.push('', `## ${zh ? '能力指南' : 'Capability guides'}`, '', `* [${zh ? '能力目录' : 'Capabilities'}](capabilities.md)`, `* [${zh ? '模型目录' : 'Model catalog'}](models.md)`);
  const capabilities = [`# ${zh ? '能力目录' : 'Capabilities'}`, '', zh ? '选择所需能力，先阅读调用指南，再查看接口参数。' : 'Choose a capability, read its guide, then explore the endpoint reference.', '', '| ' + (zh ? '能力 | 调用指南 | 接口参考' : 'Capability | Guide | API reference') + ' |', '| --- | --- | --- |'];
  const models = [`# ${zh ? '模型目录' : 'Model catalog'}`, '', zh ? '以下为本站公开调用名称，名称不构成原厂直连或精确模型快照保证。可用性与当前账户的模型权限有关。' : 'Public product route names do not guarantee original-provider access or a precise model snapshot. Availability depends on your account model permissions.', '', '| ' + (zh ? '调用名称 | 能力 | 说明' : 'Route | Capability | Guide') + ' |', '| --- | --- | --- |'];
  const referenceSummary = [];
  for (const { manifest, spec, guides } of bundles) {
    generated.set(`${locale}/guides/${manifest.id}.md`, guides[locale]);
    summary.push(`* [${manifest.title[locale]}](guides/${manifest.id}.md)`);
    const operations = Object.entries(spec.paths).flatMap(([endpoint, item]) => methods.filter((method) => item[method]).map((method) => ({ endpoint, method, operation: item[method], parameters: [...(item.parameters ?? []), ...(item[method].parameters ?? [])] })));
    const indexPath = `api-reference/${manifest.id}/README.md`;
    const index = [`# ${manifest.title[locale]} API`, '', `[${zh ? '调用指南' : 'Read the guide'}](../../guides/${manifest.id}.md) · [OpenAPI JSON](${registry.specBaseUrl}/${manifest.id}.json)`, '', '| ' + (zh ? '方法 | 路径 | 说明' : 'Method | Path | Description') + ' |', '| --- | --- | --- |'];
    capabilities.push(`| ${manifest.title[locale]} | [${zh ? '阅读指南' : 'Read guide'}](guides/${manifest.id}.md) | [API](api-reference/${manifest.id}/README.md) |`);
    for (const model of manifest.models ?? []) models.push(`| \`${model}\` | ${manifest.title[locale]} | [${zh ? '能力与限制' : 'Capabilities and limits'}](guides/${manifest.id}.md) |`);
    referenceSummary.push(`* [${manifest.title[locale]}](${indexPath})`);
    for (const { endpoint, method, operation, parameters } of operations) {
      const slug = operation.operationId.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      const title = zh ? operation['x-title-zh'] ?? operation.summary : operation.summary;
      const filename = `${slug}.md`;
      index.push(`| ${method.toUpperCase()} | \`${endpoint}\` | [${title}](${filename}) |`);
      referenceSummary.push(`  * [${title}](api-reference/${manifest.id}/${filename})`);
      const specUrl = `${registry.specBaseUrl}/${manifest.id}.json`;
      const page = [`# ${title}`, '', `\`${method.toUpperCase()} ${endpoint}\``, '', (zh ? operation['x-description-zh'] : undefined) ?? operation.description ?? '', '', `[${zh ? '调用指南与限制' : 'Guide and limits'}](../../guides/${manifest.id}.md)`, '', `{% openapi src="${specUrl}" path="${endpoint}" method="${method}" %}`, specUrl, '{% endopenapi %}', ''];
      if (parameters.length) {
        page.push(`## ${zh ? '路径与请求头' : 'Path and header parameters'}`, '', '| Name | In | Required | Description |', '| --- | --- | --- | --- |');
        for (const parameter of parameters) page.push(`| \`${parameter.name}\` | ${parameter.in} | ${parameter.required ? 'yes' : 'no'} | ${cell(parameter.description ?? '')} |`);
        page.push('');
      }
      for (const [contentType, body] of Object.entries(operation.requestBody?.content ?? {})) {
        page.push(`## ${contentType}`, '');
        const schema = dereference(spec, body.schema);
        if (schema.description) page.push(schema.description, '');
        page.push(zh ? '| 参数 | 类型 | 必填 | 默认值 / 可选值 | 说明 |' : '| Name | Type | Required | Default / values | Description |', '| --- | --- | --- | --- | --- |');
        for (const [name, definition] of Object.entries(schema.properties ?? {})) {
          const field = dereference(spec, definition);
          const type = field.type ?? (field.oneOf ? field.oneOf.map((item) => dereference(spec, item).type ?? 'object').join(' / ') : 'string');
          const values = field.enum ? field.enum.join(', ') : field.const !== undefined ? JSON.stringify(field.const) : field.default !== undefined ? JSON.stringify(field.default) : '—';
          page.push(`| \`${name}\` | ${cell(type)} | ${schema.required?.includes(name) ? (zh ? '是' : 'yes') : (zh ? '否' : 'no')} | ${cell(values)} | ${cell((zh ? field['x-description-zh'] : undefined) ?? field.description ?? '')} |`);
        }
        page.push('');
        if (body.example) page.push(`### ${zh ? '请求示例' : 'Example request'}`, '', '```json', JSON.stringify(body.example, null, 2), '```', '');
      }
      page.push(`## ${zh ? '响应' : 'Responses'}`, '', '| Status | Description |', '| --- | --- |');
      for (const [status, response] of Object.entries(operation.responses)) page.push(`| ${status} | ${cell(response.description ?? '')} |`);
      page.push('');
      for (const [type, body] of Object.entries(operation.responses['200']?.content ?? {})) {
        if (body.example) page.push(`### ${type}`, '', type === 'application/json' ? '```json' : '```text', typeof body.example === 'string' ? body.example : JSON.stringify(body.example, null, 2), '```', '');
      }
      const destination = `${locale}/api-reference/${manifest.id}/${filename}`;
      if (generated.has(destination)) throw new Error(`Page collision: ${destination}`);
      generated.set(destination, page.join('\n'));
    }
    generated.set(`${locale}/${indexPath}`, index.join('\n') + '\n');
  }
  summary.push('', '## API Reference', '', ...referenceSummary, '');
  generated.set(`${locale}/SUMMARY.md`, summary.join('\n'));
  generated.set(`${locale}/capabilities.md`, capabilities.join('\n') + '\n');
  generated.set(`${locale}/models.md`, models.join('\n') + '\n');
}

// 导航和普通 Markdown 链接在本地可校验，不能依赖 GitBook 替我们修复坏链接。
for (const [filename, content] of generated) {
  if (!filename.endsWith('.md')) continue;
  const prose = content.replace(/```[\s\S]*?```/g, '');
  for (const match of prose.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].split('#')[0];
    if (!href || /^[a-z]+:|^\//i.test(href)) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(filename), href));
    if (!generated.has(target)) throw new Error(`Broken link: ${filename} -> ${href}`);
  }
}
const trackedPath = path.join(output, '.generated.json');
let previous = [];
try { previous = JSON.parse(await readFile(trackedPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const outdated = previous.filter((name) => !generated.has(name));
const differing = [];
for (const [name, content] of generated) {
  publicPath(name);
  let current;
  try { current = await readFile(path.join(output, name), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (current !== content) differing.push(name);
}
if (check) {
  if (outdated.length || differing.length || JSON.stringify(previous) !== JSON.stringify([...generated.keys()].sort())) throw new Error(`GitBook output needs rebuild: ${[...outdated, ...differing].join(', ')}`);
  console.log(`Validated ${generated.size} generated GitBook files and all local links.`);
} else {
  for (const name of outdated) await rm(path.join(output, publicPath(name)));
  for (const [name, content] of generated) {
    const target = path.join(output, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  await writeFile(trackedPath, JSON.stringify([...generated.keys()].sort(), null, 2) + '\n');
  console.log(`Built ${generated.size} GitBook files in Chinese and English.`);
}

function dereference(spec, schema = {}) {
  return schema.$ref ? schema.$ref.slice(2).split('/').reduce((value, key) => value[key], spec) : schema;
}

function cell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}
