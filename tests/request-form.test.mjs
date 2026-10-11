import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { buildPlaygroundRequest, createRequestValidator, requestFormData, requestFormDefinition } from '../site/.vitepress/theme/request-form.mjs';
import { operationExamples, resolveSchema, requestCode } from '../site/.vitepress/theme/openapi-content.mjs';
import { parameterDescription, schemaConstraints, schemaRules } from '../site/.vitepress/theme/schema-presentation.mjs';
const contracts = Object.fromEntries(await Promise.all(['media-image', 'media-video', 'media-tts'].map(async id => [id, JSON.parse(await readFile(new URL(`../catalog/${id}/openapi.json`, import.meta.url), 'utf8'))])));
const ajv = createRequestValidator();
const speech = { spec: contracts['media-tts'], endpoint: '/tts/v1/tasks', method: 'post', mediaType: 'application/json', model: 'vox-1', locale: 'zh' };

test('every published model and mode compiles and retains valid seeds without optional defaults', () => {
  let count = 0;
  for (const spec of Object.values(contracts)) {
    const original = JSON.stringify(spec);
    for (const [endpoint, item] of Object.entries(spec.paths)) for (const method of ['get', 'post', 'head']) {
      if (!item[method]) continue;
      const operation = item[method];
      for (const mediaType of Object.keys(operation.requestBody?.content ?? { 'application/json': {} })) {
        const models = resolveSchema(spec, resolveSchema(spec, operation.requestBody?.content[mediaType].schema).properties?.model).enum ?? [undefined];
        for (const model of models) for (const mode of operationExamples(spec, operation, mediaType, model)) {
          const definition = requestFormDefinition({ spec, endpoint, method, mediaType, model, locale: 'zh' });
          const validate = ajv.compile(definition.schema);
          const data = requestFormData({ example: mode.example, model, parameters: definition.parameters, hasBody: Boolean(operation.requestBody) });
          if (mode.example !== undefined) assert.equal(validate(data), true, `${endpoint} ${model} ${mode.id}: ${JSON.stringify(validate.errors)}`);
          if (mediaType === 'multipart/form-data' && mode.example === undefined) assert.deepEqual(data.body, { model });
          if (mode.id === 'json' && data.body) assert.equal(data.body.stream, undefined);
          count++;
        }
      }
    }
    assert.equal(JSON.stringify(spec), original);
  }
  assert.ok(count >= 99);
});

test('visible explanations retain nested sound controls and invalid types fail without converting false or zero', () => {
  const definition = requestFormDefinition(speech);
  const ui = JSON.stringify(definition.uischema);
  for (const text of ['语速倍率', '音调控制', '0 不是静音', '实际效果随音色和文本变化', '默认开启', '0.5', 'false']) assert.ok(ui.includes(text), text);
  const example = operationExamples(speech.spec, speech.spec.paths[speech.endpoint].post, speech.mediaType, speech.model)[0].example;
  const data = requestFormData({ example, model: speech.model, parameters: [], hasBody: true });
  assert.equal(data.body.parameters, undefined);
  data.body.parameters = { speed: 1.25, pitch: 0, volume: 0, enhance: false };
  const validate = ajv.compile(definition.schema);
  assert.equal(validate(data), true);
  const request = buildPlaygroundRequest({ ...speech, data, apiKey: '  Bearer fictional-test-key  ' });
  assert.deepEqual(JSON.parse(request.init.body).parameters, data.body.parameters);
  assert.equal(request.init.headers.get('Authorization'), 'Bearer fictional-test-key');
  assert.equal(request.init.credentials, 'omit');
  for (const invalid of [{ pitch: .5 }, { speed: 3 }, { enhance: 'false' }, { volume: -1 }, { emotion: 'unknown' }]) assert.equal(validate({ body: { ...data.body, parameters: invalid } }), false);
  assert.equal(validate({ body: { ...data.body, extra: 1 } }), false);
  assert.equal(validate({ body: { ...data.body, text: 'a'.repeat(5001) } }), false);
});

test('multipart sends actual file arrays and preserves false/zero with no manually set boundary', () => {
  const input = { spec: contracts['media-image'], endpoint: '/v1/images/edits', method: 'post', mediaType: 'multipart/form-data', model: 'gpt-image-2', locale: 'zh' };
  const definition = requestFormDefinition(input);
  const files = [new File(['first'], 'first image.png', { type: 'image/png' }), new File(['second'], "second's.png", { type: 'image/png' })];
  const data = { body: { model: input.model, prompt: 'Edit this image', 'image[]': files, stream: false, partial_images: 0 } };
  const request = buildPlaygroundRequest({ ...input, data, apiKey: 'fictional-test-key' });
  assert.equal(request.init.headers.has('Content-Type'), false);
  assert.equal(request.init.body.getAll('image[]').length, 2);
  assert.equal(request.init.body.getAll('image[]')[1].name, "second's.png");
  assert.equal(request.init.body.get('stream'), 'false');
  assert.equal(request.init.body.get('partial_images'), '0');
  const validate = ajv.compile(definition.schema);
  assert.equal(validate({ body: { model: input.model, prompt: 'Edit', 'image[]': files } }), true, JSON.stringify(validate.errors));
  assert.equal(validate({ body: { model: input.model, prompt: 'Edit', image: 'fake-file-path' } }), false);
  assert.equal(validate({ body: { model: input.model, prompt: 'Edit', image: files[0], 'image[]': files } }), false);
  const codes = requestCode({ ...input, example: data.body, requestUrl: request.url });
  for (const value of Object.values(codes)) { assert.ok(value.includes('first image.png')); assert.ok(!value.includes('fictional-test-key')); }
  assert.match(codes.python, /files = \[\(name, open/);
  execFileSync(process.execPath, ['--input-type=module', '--check'], { input: codes.javascript });
});

test('path, query and Range values match preview and HEAD never sends a body', () => {
  const spec = structuredClone(contracts['media-video']);
  const endpoint = '/v1/videos/{video_id}/content';
  spec.paths[endpoint].get.parameters = [...(spec.paths[endpoint].get.parameters ?? []), { name: 'tag', in: 'query', schema: { type: 'array', items: { type: 'string' } } }];
  const input = { spec, endpoint, method: 'get', mediaType: 'application/json' };
  assert.throws(() => buildPlaygroundRequest({ ...input, data: {}, apiKey: 'test' }), /Missing path/);
  const data = { path: { video_id: 'task space' }, query: { tag: ['a', 'b'] }, header: { Range: 'bytes=0-99' } };
  const request = buildPlaygroundRequest({ ...input, data, apiKey: 'fictional-test-key' });
  assert.equal(new URL(request.url).pathname, '/v1/videos/task%20space/content');
  assert.deepEqual(new URL(request.url).searchParams.getAll('tag'), ['a', 'b']);
  assert.equal(request.init.headers.get('Range'), 'bytes=0-99');
  assert.equal(request.init.body, undefined);
  const codes = requestCode({ ...input, parameters: data, requestUrl: request.url });
  for (const code of Object.values(codes)) { assert.ok(code.includes(request.url)); assert.ok(code.includes('bytes=0-99')); assert.ok(!code.includes('fictional-test-key')); }
  assert.equal(buildPlaygroundRequest({ ...input, method: 'head', data, apiKey: 'test' }).init.body, undefined);
});

// 同一份组合规则既用于正文，也在调试输入前展示；仍由原始 schema 拒绝冲突请求。
test('forms explain file alternatives and conditional model limits before submission', () => {
  const image = contracts['media-image'];
  const upload = { spec: image, endpoint: '/v1/images/edits', method: 'post', mediaType: 'multipart/form-data', model: 'gpt-image-2', locale: 'zh' };
  const definition = requestFormDefinition(upload);
  const rules = schemaRules(resolveSchema(image, image.paths[upload.endpoint].post.requestBody.content[upload.mediaType].schema), 'zh');
  assert.ok(rules.some(line => line.includes('image') && line.includes('image[]')));
  for (const rule of rules) assert.ok(JSON.stringify(definition.uischema).includes(rule));
  for (const locale of ['zh', 'en']) {
    const video = contracts['media-video'];
    const input = { spec: video, endpoint: '/v1/videos', method: 'post', mediaType: 'application/json', model: 'cogvideo-short', locale };
    const form = requestFormDefinition(input);
    const schema = resolveSchema(video, video.paths[input.endpoint].post.requestBody.content[input.mediaType].schema);
    for (const rule of schemaRules(schema, locale)) assert.ok(JSON.stringify(form.uischema).includes(rule.replaceAll('"', '\\"')));
    assert.match(JSON.stringify(form.uischema), /720x1280/);
    assert.equal(form.schema.properties.body.properties.seconds.oneOf[0].title.startsWith(locale === 'zh' ? '整数' : 'integer'), true);
    assert.equal(form.schema.properties.body.properties.seconds.oneOf[1].title.startsWith(locale === 'zh' ? '字符串' : 'string'), true);
    const validate = ajv.compile(form.schema);
    assert.equal(validate({ body: { model: 'cogvideo-short', prompt: 'Test', seconds: 5 } }), false);
    assert.equal(validate({ body: { model: 'cogvideo-short', prompt: 'Test', seconds: 8 } }), true);
  }
});

test('shared hints preserve strict boundaries and source-free parameter transport explanations', () => {
  const schema = { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 2, default: 0, format: 'double' };
  assert.deepEqual(schemaConstraints(schema, 'zh'), ['大于: 0', '小于: 2', '默认: 0', '格式: "double"']);
  assert.equal(schemaConstraints({ default: false }, 'en')[0], 'Default: false');
  assert.match(parameterDescription({ name: 'response_id', in: 'path' }, 'zh'), /\{response_id\}/);
  assert.match(parameterDescription({ name: 'Range', in: 'header' }, 'en'), /HTTP request header/);
  const spec = { servers: [{ url: 'https://example.com' }], paths: { '/test': { get: { parameters: [{ name: 'offset', in: 'query', schema }], responses: {} } } } };
  const form = requestFormDefinition({ spec, endpoint: '/test', method: 'get', locale: 'zh' });
  assert.ok(JSON.stringify(form.uischema).includes('大于: 0'));
  assert.ok(JSON.stringify(form.uischema).includes('小于: 2'));
});
