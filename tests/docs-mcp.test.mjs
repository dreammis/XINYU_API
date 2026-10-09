import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/build-site.mjs']);
const { onRequest } = await import('../functions/mcp.js');
const call = (method, params, options = {}) => onRequest({ request: new Request('https://xyapi-docs.pages.dev/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...options.headers }, body: options.body ?? JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }) });
test('MCP initializes, searches and reads only generated customer documentation', async () => {
  const initialized = await (await call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } })).json();
  assert.equal(initialized.result.protocolVersion, '2025-06-18');
  const list = await (await call('tools/list')).json();
  assert.deepEqual(list.result.tools.map(tool => tool.name), ['search_docs', 'read_document']);
  const searched = await (await call('tools/call', { name: 'search_docs', arguments: { query: 'cogvideo-short', locale: 'zh' } })).json();
  const matches = JSON.parse(searched.result.content[0].text);
  assert.ok(matches.length);
  assert.ok(matches.every(doc => doc.path.startsWith('/markdown/zh/') && !/maintenance|handoff/.test(doc.path)));
  const read = await (await call('tools/call', { name: 'read_document', arguments: { path: matches[0].path } })).json();
  assert.match(read.result.content[0].text, /cogvideo-short/);
  const resources = await (await call('resources/list')).json();
  const resource = await (await call('resources/read', { uri: resources.result.resources[0].uri })).json();
  assert.equal(resource.result.contents[0].mimeType, 'text/markdown');
  for (const path of ['/markdown/../sources.json', 'https://example.org/', '/docs/maintenance/api-release-sop.md']) {
    const result = await (await call('tools/call', { name: 'read_document', arguments: { path } })).json();
    assert.equal(result.result.isError, true);
  }
});
test('MCP validates transport, parameters, notifications and request size', async () => {
  assert.equal((await call('ping', {}, { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await call('ping', {}, { headers: { 'MCP-Protocol-Version': 'invalid' } })).status, 400);
  assert.equal((await call('ping', {}, { body: ' '.repeat(32769) })).status, 413);
  assert.equal((await call('ping', {}, { body: '{' })).status, 400);
  assert.equal((await call('ping', {}, { body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) })).status, 202);
  assert.equal((await call('ping', {}, { headers: { Accept: 'text/html' } })).status, 406);
  const invalid = await (await call('tools/call', { name: 'search_docs', arguments: { query: '', locale: 'fr' } })).json();
  assert.equal(invalid.error.code, -32602);
  assert.equal((await onRequest({ request: new Request('https://xyapi-docs.pages.dev/mcp') })).status, 405);
});
