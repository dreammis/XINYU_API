import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// 直接使用真实适配器校验公开模型及示例，文档改变时不能只检查 JSON 语法。
for (const id of ['media-image', 'media-video', 'media-tts']) {
  const base = new URL(`./${id}/`, import.meta.url);
  const pluginText = await readFile(new URL('plugin.js', base), 'utf8');
  const plugin = await import('data:text/javascript;base64,' + Buffer.from(pluginText).toString('base64'));
  const manifest = JSON.parse(await readFile(new URL('public-docs.json', base), 'utf8'));
  const spec = JSON.parse(await readFile(new URL('public-openapi.json', base), 'utf8'));

  test(`${id}: exported models and version match the actual adapter`, () => {
    assert.deepEqual(manifest.models, plugin.meta.models);
    assert.equal(manifest.version, plugin.meta.version);
    assert.equal(spec.info.version, manifest.version);
  });

  for (const [endpoint, pathItem] of Object.entries(spec.paths)) {
    const example = pathItem.post?.requestBody?.content?.['application/json']?.example;
    if (!example) continue;
    test(`${id}: ${endpoint} public example is accepted by the actual decoder`, () => {
      const payload = structuredClone(example);
      if (id === 'media-image') {
        // 入口消费展示字段并转发 url/非流式，模型等业务参数仍由原插件验证。
        delete payload.delivery;
        delete payload.partial_images;
        delete payload.progress;
        payload.stream = false;
        payload.response_format = 'url';
        const result = plugin.protocols.openai_image.decodeRequest({ model: payload.model, operation: endpoint.endsWith('/edits') ? 'edit' : 'generate', body: { kind: 'json', value: payload } });
        assert.equal(result.kind, 'submit');
      } else if (id === 'media-tts') {
        assert.equal(plugin.native.create({body: {kind: 'json', value: payload}}).kind, 'submit');
      } else {
        const protocol = endpoint === '/v1/responses' ? plugin.protocols.openai_responses : plugin.protocols.openai_video;
        assert.equal(protocol.decodeRequest({ model: payload.model, body: { kind: 'json', value: payload } }).kind, 'submit');
      }
    });
  }
}
