import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { meta, normalizeRequest, native, buildSubmitRequest, parseSubmitResponse, buildQueryRequest, parseTaskResult, extractUsage, listArtifacts, buildContentRequest } from './plugin.js';

const catalog = JSON.parse(readFileSync(new URL('./public-assets/voices.json', import.meta.url)));
const request = { model: 'vox-1', text: '你好', voice: catalog.models[0].default_voice };
test('public contract version, model and request examples match the native adapter', () => {
  const manifest = JSON.parse(readFileSync(new URL('./public-docs.json', import.meta.url)));
  const spec = JSON.parse(readFileSync(new URL('./public-openapi.json', import.meta.url)));
  assert.equal(manifest.version, meta.version);
  assert.equal(spec.info.version, meta.version);
  assert.deepEqual(manifest.models, meta.models);
  for (const path of Object.values(spec.paths)) {
    const example = path.post?.requestBody?.content?.['application/json']?.example;
    if (example) assert.equal(native.create({body:{kind:'json',value:example}}).kind,'submit');
  }
});
test('preserves all sound controls, including false and zero', () => {
  const normalized = normalizeRequest({...request, parameters: {speed: 1.25, pitch: -1, volume: 0, emotion: 'happy', enhance: false}, output: {format: 'mp3'}});
  assert.equal(normalized.input_text, '你好');
  assert.equal(normalized.speed, 1.25); assert.equal(normalized.pitch, -1);
  assert.equal(normalized.volume, 0); assert.equal(normalized.emotion, 'happy'); assert.equal(normalized.enhance, false);
  assert.notEqual(normalized.voice, request.voice);
});
test('rejects unsupported parameters, formats, voices and numeric coercion', () => {
  for (const input of [{...request, output:{format:'wav'}}, {...request, voice:'raw_voice'}, {...request, parameters:{pitch: .5}}, {...request, parameters:{speed:'1'}}, {...request, parameters:{enhance:'false'}}, {...request, parameters:{emotion:'unsupported'}}, {...request, parameters:{bogus:1}}, {...request, model:'vidu-tts'}, {...request, text:'x'.repeat(5001)}, {...request, text:'好'.repeat(2501)}, {...request, text:' '}]) assert.throws(() => normalizeRequest(input));
});
test('counts Unicode code points and keeps the input unchanged', () => {
  assert.equal(normalizeRequest({...request, text:'😀'.repeat(5000)}).input_text.length,10000);
  assert.equal(normalizeRequest({...request, text:'好'.repeat(2500)}).input_text.length,2500);
  assert.throws(() => normalizeRequest({...request, text:'好'.repeat(2500)+'a'}));
});
test('native interface keeps supplier fields and errors private', () => {
  const task={task_id:'public-id',status:'SUCCESS',data:{id:'vendor-id',url:'https://vidu.example',model:'vidu-tts'}};
  const result=native.status({},task);
  assert.deepEqual(result,{id:'public-id',model:'vox-1',status:'succeeded',audio:{format:'mp3',mime_type:'audio/mpeg',artifacts:'/v1/tasks/public-id/artifacts'}});
  assert.doesNotMatch(JSON.stringify(native.status({}, {...task,status:'FAILURE',data:{error:{message:'vidu private'}}})),/vidu|private/i);
});
test('maps the durable upstream lifecycle and authenticated artifact content', () => {
  const context={baseUrl:'https://upstream.example/',authHeader:'Bearer fixture',requestBody:normalizeRequest(request),taskId:'a'.repeat(32)};
  assert.equal(buildSubmitRequest(context).url,'https://upstream.example/internal/tts/tasks');
  assert.equal(parseSubmitResponse(context,{statusCode:200,body:{id:context.taskId,status:'queued'}}).taskId,context.taskId);
  assert.equal(buildQueryRequest(context).headers.Authorization,'Bearer fixture');
  assert.equal(parseTaskResult(context,{status:'succeeded'},{status:200}).status,'SUCCESS');
  assert.throws(()=>parseTaskResult(context,{status:'unknown'},{status:200}));
  assert.deepEqual(listArtifacts({status:'IN_PROGRESS'}),[]);
  assert.equal(listArtifacts({status:'SUCCESS'})[0].type,'audio');
  const content=buildContentRequest({...context,upstreamTaskId:context.taskId,artifactKey:'audio',clientRequest:{method:'HEAD',headers:{Range:'bytes=0-99'}}});
  assert.equal(content.method,'HEAD'); assert.equal(content.headers.Range,'bytes=0-99'); assert.equal(content.headers.Authorization,'Bearer fixture');
  assert.equal(extractUsage(context),null);
  assert.equal(meta.routes[0].path,'/tts/v1/tasks');
});
test('every published voice is accepted and previews use neutral local assets', () => {
  assert.equal(new Set(catalog.voices.map(v=>v.id)).size,catalog.voices.length);
  for(const voice of catalog.voices) {
    normalizeRequest({...request,voice:voice.id});
    if (voice.preview_url === null) continue;
    assert.match(voice.preview_url,/^\/assets\/media-tts\/samples\/vx_[a-f0-9]{12}\.mp3$/);
    const bytes=readFileSync(new URL('./public-assets/samples/'+voice.id+'.mp3',import.meta.url));
    assert.equal(bytes[0],255); assert.equal(bytes[1]&224,224);
  }
  assert.doesNotMatch(JSON.stringify(catalog),/vidu|cf\.vidu|voice_id|source_chunk/i);
});
