import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {executionMode, taskState, createSseParser, streamOutcome} from '../site/.vitepress/theme/execution-mode.mjs';
import {buildPlaygroundRequest} from '../site/.vitepress/theme/request-form.mjs';

test('published task protocols distinguish submission, background and stream from synchronous results', async () => {
  for (const id of ['media-tts', 'media-video']) {
    const spec = JSON.parse(await readFile(new URL(`../projects/vidu2api/newapi/${id}/public-openapi.json`, import.meta.url), 'utf8'));
    for (const [endpoint, item] of Object.entries(spec.paths)) {
      const operation = item.post;
      if (!operation?.['x-playground-task']) continue;
      const protocol = operation['x-playground-task'];
      assert.equal(executionMode(operation, protocol.when ?? {}), 'async');
      assert.equal(executionMode(operation, {...protocol.when, stream: true}), 'stream');
      if (protocol.when) assert.equal(executionMode(operation, {}), 'sync');
      const task = taskState(protocol, {id:'task/slash', status:protocol.states[0]});
      const request = buildPlaygroundRequest({spec, endpoint:protocol.poll, method:'get', data:{path:{[protocol.parameter]:task.id}}, apiKey:'test-key'});
      assert.equal(request.init.method, 'GET');
      assert.equal(request.init.body, undefined);
      assert.match(request.url, /task%2Fslash/);
      assert.equal(taskState(protocol, {id:'task',status:protocol.completed[0]}).complete, true);
      assert.equal(taskState(protocol, {id:'task',status:protocol.failed[0]}).failed, true);
      assert.throws(() => taskState(protocol, {id:'task',status:'unrecognized'}));
      for (const path of [protocol.artifacts, protocol.download].filter(Boolean)) assert.ok(spec.paths[path].get, `${endpoint}: undeclared follow-up`);
    }
  }
  assert.equal(executionMode({}, {}), 'sync');
});

test('SSE preserves fragmented CRLF, multiline data, comments and terminal markers', () => {
  const events=[];
  const parse=createSseParser(event=>events.push(event));
  const input=': heartbeat\r\n\r\nevent: response.completed\r\ndata: {"text":\r\ndata: "你好"}\r\n\r\ndata: [DONE]\n\n';
  for (const char of input) parse(char);
  assert.deepEqual(events,[{event:'response.completed',data:'{"text":\n"你好"}'},{event:'message',data:'[DONE]'}]);
});

test('only declared completion/error events determine the stream outcome', () => {
  const operation={'x-playground-stream':{completed:['response.completed'],failed:['error']}};
  assert.equal(streamOutcome(operation,{event:'message',data:'[DONE]'}), null);
  assert.equal(streamOutcome(operation,{event:'progress',data:'{}'}), null);
  assert.equal(streamOutcome(operation,{event:'response.completed',data:'{}'}), 'completed');
  assert.equal(streamOutcome(operation,{event:'message',data:'{"type":"error"}'}), 'failed');
});
