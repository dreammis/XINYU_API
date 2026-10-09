import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateBundle } from '../scripts/docs-contract.mjs';
import { modelOperations, requestCode, requestExample } from '../site/.vitepress/theme/openapi-content.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

// 实际运行两个生成器，验证改版不会改变公开协议或引入不可调用的模型入口。
test('series and model pages preserve public contracts and reject broken selection chapters', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'xyapi-redesign-'));
  try {
    for (const name of ['content', 'catalog', 'sources.json']) await cp(path.join(root, name), path.join(directory, name), { recursive: true });
    const run = (script) => execFileSync(process.execPath, [path.join(root, 'scripts', script)], { env: { ...process.env, DOCS_ROOT: directory }, stdio: 'pipe' });
    run('build-docs.mjs');
    run('build-site.mjs');
    const data = JSON.parse(await readFile(path.join(directory, 'site/.vitepress/catalog.json'), 'utf8'));
    assert.equal(data.capabilities.reduce((count, item) => count + item.models.length, 0), 14);
    assert.deepEqual(data.capabilities.map(item => item.category), ['image', 'video']);
    for (const capability of data.capabilities) {
      assert.equal(await readFile(path.join(directory, `site/public/openapi/${capability.id}.json`), 'utf8'), await readFile(path.join(directory, `gitbook/openapi/${capability.id}.json`), 'utf8'));
      for (const model of capability.models) {
        const page = await readFile(path.join(directory, `site/zh/models/${capability.id}/${model.slug}.md`), 'utf8');
        assert.ok(page.includes(model.name));
        assert.ok(modelOperations(JSON.parse(await readFile(path.join(directory, `catalog/${capability.id}/openapi.json`), 'utf8')), model.name).length);
      }
    }
    const page = await readFile(path.join(directory, 'site/zh/api-reference/media-image/generate-image.md'), 'utf8');
    assert.equal((page.match(/ApiPlayground/g) ?? []).length, 1);
    assert.doesNotMatch(page, /\| 参数|## 响应|{% openapi/);
    const overview = await readFile(path.join(directory, 'site/zh/api-reference/media-video/index.md'), 'utf8');
    assert.match(overview, /固定 8 秒/);
    const registry = JSON.parse(await readFile(path.join(directory, 'sources.json'), 'utf8'));
    registry.sources[1].selectionSections.zh = ['不存在的章节'];
    await writeFile(path.join(directory, 'sources.json'), JSON.stringify(registry));
    assert.throws(() => run('build-site.mjs'), /missing selection section/);
    assert.equal(await readFile(path.join(directory, 'site/zh/api-reference/media-video/index.md'), 'utf8'), overview);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('model presentation metadata cannot invent models, operations or categories', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'catalog/media-image/public-docs.json'), 'utf8'));
  const spec = JSON.parse(await readFile(path.join(root, 'catalog/media-image/openapi.json'), 'utf8'));
  const guides = Object.fromEntries(await Promise.all(['zh', 'en'].map(async locale => [locale, await readFile(path.join(root, `catalog/media-image/guide.${locale}.md`), 'utf8')])));
  assert.throws(() => validateBundle({ ...manifest, category: 'made-up' }, spec, guides), /invalid category/);
  assert.throws(() => validateBundle({ ...manifest, modelDetails: { unknown: {} } }, spec, guides), /unknown model detail/);
  assert.throws(() => validateBundle({ ...manifest, modelDetails: { 'gpt-image-2': { operations: ['fakeOperation'] } } }, spec, guides), /unknown model operation/);
  assert.throws(() => validateBundle({ ...manifest, modelDetails: { 'gpt-image-2': { title: { zh: '名称' } } } }, spec, guides), /incomplete model title/);
  validateBundle({ ...manifest, category: 'image', modelDetails: { 'gpt-image-2': { group: 'gpt-image', operations: ['generateImage', 'editImage'] } } }, spec, guides);
});

test('code examples retain SSE handling, multipart uploads, authenticated downloads and HEAD semantics', async () => {
  const image = JSON.parse(await readFile(path.join(root, 'catalog/media-image/openapi.json'), 'utf8'));
  const body = image.paths['/v1/images/generations'].post.requestBody.content['application/json'];
  const example = requestExample(image, body, 'gpt-image-2.5-pro');
  assert.equal(example.model, 'gpt-image-2.5-pro');
  assert.equal(body.example.model, 'gpt-image-2');
  const lite = requestExample(image, body, 'gemini-3.1-flash-lite-image');
  assert.equal(lite.resolution, undefined);
  assert.equal(lite.stream, undefined);
  const stream = requestCode({ spec: image, endpoint: '/v1/images/generations', method: 'post', mediaType: 'application/json', example: requestExample(image, body) });
  assert.match(stream.curl, /curl -N/);
  assert.match(stream.python, /iter_lines/);
  assert.match(stream.javascript, /for await/);
  execFileSync(process.execPath, ['--input-type=module', '--check'], { input: stream.javascript });
  const video = JSON.parse(await readFile(path.join(root, 'catalog/media-video/openapi.json'), 'utf8'));
  const short = requestExample(video, video.paths['/v1/videos'].post.requestBody.content['application/json'], 'cogvideo-short');
  assert.deepEqual(Object.keys(short).sort(), ['model', 'prompt']);
  const download = requestCode({ spec: video, endpoint: '/v1/videos/{video_id}/content', method: 'get' });
  assert.match(download.curl, /YOUR_VIDEO_ID/);
  assert.match(download.curl, /-o result.mp4/);
  assert.match(download.python, /iter_content/);
  const head = requestCode({ spec: video, endpoint: '/v1/videos/{video_id}/content', method: 'head' });
  assert.doesNotMatch(head.curl, /-o result/);
  assert.match(head.javascript, /response.headers/);
  // multipart 的契约未提供完整 example；用公开指南的文件字段检查上传代码，不能捏造并发布示例。
  const upload = requestCode({ spec: image, endpoint: '/v1/images/edits', method: 'post', mediaType: 'multipart/form-data', example: { model: 'gpt-image-2', prompt: 'Edit this reference', image: '@reference.png' } });
  assert.match(upload.curl, /-F/);
  assert.match(upload.javascript, /FormData/);
  assert.doesNotMatch(upload.javascript, /'Content-Type': 'multipart\/form-data'/);
  execFileSync(process.execPath, ['--input-type=module', '--check'], { input: upload.javascript });
});
