import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateBundle } from '../scripts/docs-contract.mjs';
import { modelOperations, operationExamples, requestCode, requestExample, responseExampleFor } from '../site/.vitepress/theme/openapi-content.mjs';

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
    assert.equal(data.capabilities.reduce((count, item) => count + item.models.length, 0), 15);
    assert.deepEqual(data.capabilities.map(item => item.category), ['image', 'video', 'tts']);
    const short = data.capabilities[1].models.find(model => model.name === 'cogvideo-short');
    assert.ok(short.facts.zh.some(fact => fact.value === '固定 8 秒'));
    assert.equal(short.facts.zh.find(fact => fact.label === '单图生').value, '不支持');
    assert.ok(short.facts.en.some(fact => fact.value === 'Exactly 8s'));
    const lite = data.capabilities[0].models.find(model => model.name === 'gemini-3.1-flash-lite-image');
    assert.match(lite.notes.zh.join('\n'), /只支持 1K/);
    const gpt = data.capabilities[0].models.find(model => model.name === 'gpt-image-2');
    assert.match(gpt.notes.zh.join('\n'), /2880×2880/);
    assert.match(gpt.notes.zh.join('\n'), /3840×2160/);
    for (const capability of data.capabilities) {
      assert.equal(await readFile(path.join(directory, `site/public/openapi/${capability.id}.json`), 'utf8'), await readFile(path.join(directory, `gitbook/openapi/${capability.id}.json`), 'utf8'));
      for (const model of capability.models) {
        const page = await readFile(path.join(directory, `site/zh/models/${capability.id}/${model.slug}.md`), 'utf8');
        assert.ok(page.includes(model.name));
        assert.ok(modelOperations(JSON.parse(await readFile(path.join(directory, `catalog/${capability.id}/openapi.json`), 'utf8')), model.name).length);
        const endpoint = await readFile(path.join(directory, `site/zh/api-reference/${capability.id}/models/${model.slug}/${capability.operations[0].slug}.md`), 'utf8');
        assert.match(endpoint, new RegExp(`model="${model.name.replaceAll('.', '\\.') }"`));
      }
    }
    const page = await readFile(path.join(directory, 'site/zh/api-reference/media-image/generate-image.md'), 'utf8');
    assert.equal((page.match(/ApiPlayground/g) ?? []).length, 1);
    assert.doesNotMatch(page, /\| 参数|## 响应|{% openapi/);
    const overview = await readFile(path.join(directory, 'site/zh/api-reference/media-video/index.md'), 'utf8');
    assert.match(overview, /固定 8 秒/);
    const sidebar = JSON.parse(await readFile(path.join(directory, 'site/.vitepress/sidebar.json'), 'utf8'));
    const active = sidebar['/zh/api-reference/media-video/models/cogvideo-short/'];
    const video = active.find(group => group.text.includes('视频系列'));
    assert.equal(video.collapsed, false);
    const family = video.items.find(item => item.text.includes('Video Studio'));
    assert.equal(family.collapsed, false);
    assert.match(family.text, /<svg/);
    assert.equal(family.items.find(item => item.link?.endsWith('/cogvideo-short')).collapsed, false);
    assert.equal(family.items.find(item => item.link?.endsWith('/cogvideo-fast')).collapsed, true);
    assert.ok(family.items.find(item => item.link?.endsWith('/cogvideo-short')).items.some(item => item.link.endsWith('/cogvideo-short/create-video')));
    const llms = await readFile(path.join(directory, 'site/public/llms.txt'), 'utf8');
    assert.match(llms, /markdown\/zh\/api-reference\/media-image\/generate-image.md/);
    assert.doesNotMatch(llms, /maintenance|upstream-task|newapi-task|handoff|sources.json/);
    const exported = await readFile(path.join(directory, 'site/public/markdown/zh/api-reference/media-image/models/gemini-3.1-flash-lite-image/generate-image.md'), 'utf8');
    assert.match(exported, /gemini-3.1-flash-lite-image/);
    assert.match(exported, /流式 SSE · URL 交付/);
    assert.doesNotMatch(exported, /ApiPlayground|{%/);
    const registry = JSON.parse(await readFile(path.join(directory, 'sources.json'), 'utf8'));
    registry.sources[1].selectionSections.zh = ['不存在的章节'];
    await writeFile(path.join(directory, 'sources.json'), JSON.stringify(registry));
    assert.throws(() => run('build-site.mjs'), /missing selection section/);
    assert.equal(await readFile(path.join(directory, 'site/zh/api-reference/media-video/index.md'), 'utf8'), overview);
    registry.sources[1].selectionSections.zh = ['模型与价格'];
    registry.sources[0].modelNotes[0].contains.zh = '不存在的模型说明';
    await writeFile(path.join(directory, 'sources.json'), JSON.stringify(registry));
    assert.throws(() => run('build-site.mjs'), /model note must match exactly one paragraph/);
    assert.equal(await readFile(path.join(directory, 'site/zh/api-reference/media-video/index.md'), 'utf8'), overview);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('request modes pair JSON and URL SSE responses without inheriting another model limits', async () => {
  const image = JSON.parse(await readFile(path.join(root, 'catalog/media-image/openapi.json'), 'utf8'));
  const before = JSON.stringify(image);
  for (const endpoint of ['/v1/images/generations', '/v1/images/edits']) {
    const operation = image.paths[endpoint].post;
    const modes = operationExamples(image, operation, 'application/json', 'gemini-3.1-flash-lite-image');
    const json = modes.find(mode => mode.id === 'json');
    assert.equal(json.example.stream, undefined);
    assert.equal(json.example.resolution, undefined);
    assert.ok(responseExampleFor(operation, '200', json.responseType, json.example).data[0].url);
    if (endpoint.endsWith('edits')) assert.ok(json.example.image);
    const url = modes.find(mode => mode.id === 'stream-url');
    assert.equal(url.example.model, 'gemini-3.1-flash-lite-image');
    assert.equal(url.example.stream, true);
    assert.equal(url.example.delivery, 'url');
    assert.match(responseExampleFor(operation, '200', url.responseType, url.example), /event: image_url.completed/);
    const base64 = modes.find(mode => mode.id === 'stream');
    assert.equal(responseExampleFor(operation, '200', base64.responseType, base64.example), undefined);
  }
  assert.equal(JSON.stringify(image), before);
  const video = JSON.parse(await readFile(path.join(root, 'catalog/media-video/openapi.json'), 'utf8'));
  const modes = operationExamples(video, video.paths['/v1/responses'].post, 'application/json', 'cogvideo-short');
  assert.ok(modes.every(mode => mode.example.input));
  assert.ok(modes.every(mode => mode.example.seconds === undefined && mode.example.size === undefined));
  assert.equal(modes.find(mode => mode.id === 'stream').responseType, 'text/event-stream');
  assert.equal(modes.find(mode => mode.id === 'background').example.background, true);
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
  const audio = JSON.parse(await readFile(path.join(root, 'catalog/media-tts/openapi.json'), 'utf8'));
  const audioDownload = requestCode({spec: audio, endpoint:'/v1/tasks/{task_id}/artifacts/{artifact_key}/content', method:'get'});
  assert.match(audioDownload.curl, /-o result.mp3/);
  assert.match(audioDownload.python, /iter_content/);
  assert.match(audioDownload.javascript, /arrayBuffer/);
  assert.doesNotMatch(audioDownload.javascript, /response.json/);
  // multipart 的契约未提供完整 example；用公开指南的文件字段检查上传代码，不能捏造并发布示例。
  const upload = requestCode({ spec: image, endpoint: '/v1/images/edits', method: 'post', mediaType: 'multipart/form-data', example: { model: 'gpt-image-2', prompt: 'Edit this reference', image: '@reference.png' } });
  assert.match(upload.curl, /-F/);
  assert.match(upload.javascript, /FormData/);
  assert.doesNotMatch(upload.javascript, /'Content-Type': 'multipart\/form-data'/);
  execFileSync(process.execPath, ['--input-type=module', '--check'], { input: upload.javascript });
});
