import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { publicPath, sha256, validateBundle, validateRegistry } from '../scripts/docs-contract.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const buildScript = path.join(root, 'scripts/build-docs.mjs');

// 使用独立临时目录，验证真实导入快照到 GitBook 输出的行为。
async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'xyapi-docs-'));
  await cp(path.join(root, 'content'), path.join(directory, 'content'), { recursive: true });
  await cp(path.join(root, 'catalog'), path.join(directory, 'catalog'), { recursive: true });
  await cp(path.join(root, 'sources.json'), path.join(directory, 'sources.json'));
  return directory;
}

function build(directory, check = false) {
  return execFileSync(process.execPath, [buildScript, ...(check ? ['--check'] : [])], { env: { ...process.env, DOCS_ROOT: directory }, encoding: 'utf8', stdio: 'pipe' });
}

test('publishes current models, status/download split, SSE and deterministic output', async () => {
  const directory = await fixture();
  try {
    build(directory);
    const before = await readFile(path.join(directory, 'gitbook/.generated.json'), 'utf8');
    build(directory);
    assert.equal(await readFile(path.join(directory, 'gitbook/.generated.json'), 'utf8'), before);
    build(directory, true);
    const summary = await readFile(path.join(directory, 'gitbook/zh/SUMMARY.md'), 'utf8');
    assert.match(summary, /download-video/);
    assert.match(summary, /create-video-response/);
    const models = await readFile(path.join(directory, 'gitbook/zh/models.md'), 'utf8');
    assert.match(models, /cogvideo-fast/);
    assert.doesNotMatch(models, /`video-fast`/);
    const image = JSON.parse(await readFile(path.join(directory, 'gitbook/openapi/media-image.json'), 'utf8'));
    assert.equal(image.components.schemas.ImageGenerationRequest.properties.delivery.const, 'url');
    const video = JSON.parse(await readFile(path.join(directory, 'gitbook/openapi/media-video.json'), 'utf8'));
    assert.ok(video.paths['/v1/videos/{video_id}/content'].get);
    assert.equal(video.components.schemas.VideoTask.properties.data, undefined);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('retiring a capability after updating common links removes its stale pages and spec', async () => {
  const directory = await fixture();
  try {
    build(directory);
    const registry = JSON.parse(await readFile(path.join(directory, 'sources.json'), 'utf8'));
    registry.sources = registry.sources.filter((source) => source.id !== 'media-video');
    await writeFile(path.join(directory, 'sources.json'), JSON.stringify(registry));
    // 能力下线时通用指南也要更新；构建不应悄悄删除作者写的正文或修补坏链接。
    for (const locale of ['zh', 'en']) {
      for (const filename of ['quickstart.md', 'billing.md', 'errors.md']) {
        const file = path.join(directory, 'content', locale, filename);
        const content = await readFile(file, 'utf8');
        await writeFile(file, content.replaceAll(/\[([^\]]+)\]\(guides\/media-video\.md\)/g, '$1'));
      }
    }
    build(directory);
    await assert.rejects(readFile(path.join(directory, 'gitbook/openapi/media-video.json')), { code: 'ENOENT' });
    const summary = await readFile(path.join(directory, 'gitbook/en/SUMMARY.md'), 'utf8');
    assert.doesNotMatch(summary, /media-video/);
    build(directory, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('missing or changed snapshot fails before updating an existing book', async () => {
  const directory = await fixture();
  try {
    build(directory);
    const filename = path.join(directory, 'gitbook/zh/models.md');
    const before = await readFile(filename, 'utf8');
    const guide = path.join(directory, 'catalog/media-image/guide.zh.md');
    await writeFile(guide, '# Incorrect edited snapshot\n');
    assert.throws(() => build(directory), /snapshot changed without import/);
    assert.equal(await readFile(filename, 'utf8'), before);
    await rm(guide);
    assert.throws(() => build(directory), /ENOENT/);
    assert.equal(await readFile(filename, 'utf8'), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('registry rejects duplicate IDs and source paths escaping the public bundle', async () => {
  const registry = JSON.parse(await readFile(path.join(root, 'sources.json'), 'utf8'));
  registry.sources.push(registry.sources[0]);
  assert.throws(() => validateRegistry(registry), /Duplicate/);
  for (const filename of ['../README.md', '/etc/passwd', 'C:\\secrets', 'C:/secrets', 'docs/../internal.md']) assert.throws(() => publicPath(filename), /Invalid/);
});

test('contract rejects broken schema refs, duplicate operations and model drift', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'catalog/media-image/public-docs.json'), 'utf8'));
  const original = JSON.parse(await readFile(path.join(root, 'catalog/media-image/openapi.json'), 'utf8'));
  const guides = Object.fromEntries(await Promise.all(['zh', 'en'].map(async (locale) => [locale, await readFile(path.join(root, `catalog/media-image/guide.${locale}.md`), 'utf8')])));
  const broken = structuredClone(original);
  broken.paths['/v1/images/generations'].post.requestBody.content['application/json'].schema.$ref = '#/components/schemas/Missing';
  assert.throws(() => validateBundle(manifest, broken, guides), /unresolved reference/);
  const duplicate = structuredClone(original);
  duplicate.paths['/v1/images/edits'].post.operationId = 'generateImage';
  assert.throws(() => validateBundle(manifest, duplicate, guides), /duplicate operation/);
  assert.throws(() => validateBundle({ ...manifest, models: ['obsolete-model'] }, original, guides), /model catalog/);
});

test('a registered non-model capability gets pages without frontend code changes', async () => {
  const directory = await fixture();
  try {
    const registry = JSON.parse(await readFile(path.join(directory, 'sources.json'), 'utf8'));
    const id = 'file-conversion';
    registry.sources.push({ ...registry.sources[0], id });
    await writeFile(path.join(directory, 'sources.json'), JSON.stringify(registry));
    const manifest = { schemaVersion: 1, id, title: { zh: '文件转换', en: 'File conversion' }, version: '1.0.0', models: [], openapi: 'public/openapi.json', guides: { zh: 'public/zh.md', en: 'public/en.md' } };
    const spec = { openapi: '3.1.0', info: { title: 'File conversion fixture', version: '1.0.0' }, servers: [{ url: 'https://example.com' }], security: [{ bearerAuth: [] }], components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } }, paths: { '/v1/tools/convert': { post: { operationId: 'convertFile', summary: 'Convert a file', 'x-title-zh': '转换文件', responses: { '200': { description: 'Converted output' } } } } } };
    const files = { 'public-docs.json': JSON.stringify(manifest), 'openapi.json': JSON.stringify(spec), 'guide.zh.md': '# 文件转换\n', 'guide.en.md': '# File conversion\n' };
    const hashes = Object.fromEntries(Object.entries(files).map(([name, content]) => [name, sha256(content)]));
    files['provenance.json'] = JSON.stringify({ hashes });
    const destination = path.join(directory, 'catalog', id);
    await mkdir(destination, { recursive: true });
    for (const [name, content] of Object.entries(files)) await writeFile(path.join(destination, name), content);
    build(directory);
    const summary = await readFile(path.join(directory, 'gitbook/zh/SUMMARY.md'), 'utf8');
    assert.match(summary, /file-conversion\/convert-file/);
    const page = await readFile(path.join(directory, 'gitbook/en/api-reference/file-conversion/convert-file.md'), 'utf8');
    assert.match(page, /POST \/v1\/tools\/convert/);
    assert.doesNotMatch(page, /model/);
    build(directory, true);
    execFileSync(process.execPath, [path.join(root, 'scripts/build-site.mjs')], { env: { ...process.env, DOCS_ROOT: directory }, stdio: 'pipe' });
    const sitePage = await readFile(path.join(directory, 'site/en/api-reference/file-conversion/convert-file.md'), 'utf8');
    assert.match(sitePage, /ApiPlayground spec="\/openapi\/file-conversion.json" endpoint="\/v1\/tools\/convert" method="post"/);
    assert.doesNotMatch(sitePage, /{%/);
    const sidebar = JSON.parse(await readFile(path.join(directory, 'site/.vitepress/sidebar.json'), 'utf8'));
    assert.ok(JSON.stringify(sidebar).includes('/en/api-reference/file-conversion/convert-file'));
    const { default: endpoints } = await import(pathToFileURL(path.join(directory, 'site/public-endpoints.mjs')).href);
    assert.ok(endpoints.some((item) => item.origin === 'https://example.com' && item.path === '/v1/tools/convert' && item.method === 'POST'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('remote import pins one repository revision and does not overwrite snapshots on partial failure', async () => {
  const directory = await fixture();
  try {
    const fixtureFiles = {};
    for (const id of ['media-image', 'media-video']) {
      const manifest = JSON.parse(await readFile(path.join(directory, `catalog/${id}/public-docs.json`), 'utf8'));
      fixtureFiles[`integrations/newapi/${id}/public-docs.json`] = JSON.stringify(manifest);
      fixtureFiles[manifest.openapi] = await readFile(path.join(directory, `catalog/${id}/openapi.json`), 'utf8');
      for (const locale of ['zh', 'en']) fixtureFiles[manifest.guides[locale]] = await readFile(path.join(directory, `catalog/${id}/guide.${locale}.md`), 'utf8');
    }
    await writeFile(path.join(directory, 'remote-fixture.json'), JSON.stringify(fixtureFiles));
    const mock = path.join(directory, 'mock-github.mjs');
    await writeFile(mock, `
      import assert from 'node:assert/strict';
      import { readFile } from 'node:fs/promises';
      const files = JSON.parse(await readFile(new URL('./remote-fixture.json', import.meta.url), 'utf8'));
      let commits = 0;
      globalThis.fetch = async (address) => {
        const url = new URL(address);
        if (url.pathname.includes('/commits/')) {
          assert.equal(++commits, 1, 'same repository/ref must resolve once');
          return new Response(JSON.stringify({ sha: 'pinned-fixture-sha' }));
        }
        assert.equal(url.searchParams.get('ref'), 'pinned-fixture-sha');
        const filename = decodeURIComponent(url.pathname.split('/contents/')[1]);
        if (filename.endsWith('media-video/public-docs.json')) return new Response('', { status: 404 });
        return new Response(files[filename], { status: files[filename] ? 200 : 404 });
      };
    `);
    const original = await readFile(path.join(directory, 'catalog/media-image/provenance.json'), 'utf8');
    assert.throws(() => execFileSync(process.execPath, ['--import', pathToFileURL(mock).href, path.join(root, 'scripts/sync-docs.mjs'), '--remote'], { env: { ...process.env, DOCS_ROOT: directory }, encoding: 'utf8', stdio: 'pipe' }), /media-video.*unavailable/);
    assert.equal(await readFile(path.join(directory, 'catalog/media-image/provenance.json'), 'utf8'), original);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
