import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { operationExamples, requestCode, requestExample } from '../site/.vitepress/theme/openapi-content.mjs';

test('a JSON speech request pairs with audio and SDK examples save bytes', () => {
  const operation = {requestBody: {content: {'application/json': {schema: {type: 'object', properties: {model: {enum: ['vox-1']}, input: {type: 'string'}, voice: {type: 'string'}}, required: ['model', 'input', 'voice']}, example: {model: 'vox-1', input: '你好', voice: 'vx_dbd27c4a9332'}}}}, responses: {'200': {content: {'audio/mpeg': {schema: {type: 'string', format: 'binary'}}}}}};
  const spec = {servers: [{url: 'https://example.test'}], paths: {'/v1/audio/speech': {post: operation}}};
  operation.responses['400'] = {content: {'application/json': {schema: {type: 'object'}}}};
  const mode = operationExamples(spec, operation, 'application/json', 'vox-1')[0];
  assert.equal(mode.responseType, 'audio/mpeg');
  assert.equal(mode.title.zh, '音频文件');
  const code = requestCode({spec, endpoint: '/v1/audio/speech', method: 'post', mediaType: 'application/json', example: mode.example});
  assert.match(code.curl, /-o result.mp3/);
  assert.match(code.python, /iter_content/);
  assert.match(code.javascript, /arrayBuffer/);
});

test('published synchronous and asynchronous examples preserve identical canonical fields', async () => {
  const spec = JSON.parse(await readFile(new URL('../projects/vidu2api/newapi/media-tts/public-openapi.json', import.meta.url), 'utf8'));
  const {normalizeSpeechRequest, native} = await import('../projects/vidu2api/newapi/media-tts/plugin.js');
  const sync = spec.paths['/v1/audio/speech'].post;
  const asynchronous = spec.paths['/tts/v1/tasks'].post;
  const example = sync.requestBody.content['application/json'].example;
  assert.deepEqual(example, asynchronous.requestBody.content['application/json'].example);
  assert.deepEqual(native.create({body: {kind:'json',value:example}}).requestBody, normalizeSpeechRequest(example));
  assert.equal(operationExamples(spec, sync, 'application/json', 'vox-1')[0].responseType, 'audio/mpeg');
  const minimal = requestExample(spec, asynchronous.requestBody.content['application/json'], 'vox-1');
  assert.equal(minimal.input, example.input);
  assert.equal(minimal.voice, example.voice);
  assert.equal(native.create({body: {kind:'json',value:minimal}}).kind, 'submit');
});

test('the synchronous source voice snapshot agrees exactly with the asynchronous adapter', async (context) => {
  // A 与 C 位于同一协作机时核对；独立 CI 不依赖另一工程的本机目录。
  const source = new URL('../../vidu2api/gateway/tts_voices.json', import.meta.url);
  let mapping;
  try { mapping = JSON.parse(await readFile(source, 'utf8')); } catch (error) { if (error.code === 'ENOENT') { context.skip('source project is not present on this machine'); return; } throw error; }
  const {normalizeSpeechRequest} = await import('../projects/vidu2api/newapi/media-tts/plugin.js');
  const catalog = JSON.parse(await readFile(new URL('../projects/vidu2api/newapi/media-tts/public-assets/voices.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(mapping).sort(), catalog.voices.map(voice => voice.id).sort());
  for (const voice of catalog.voices) assert.equal(normalizeSpeechRequest({model: 'vox-1', input: 'test', voice: voice.id}).voice, mapping[voice.id]);
});
