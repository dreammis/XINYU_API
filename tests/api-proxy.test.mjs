import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequest } from '../functions/api-proxy.js';

const site = 'https://docs.example.com';
const endpoint = 'https://openai.2yanx.dpdns.org';
const proxyUrl = (target) => `${site}/api-proxy?scalar_url=${encodeURIComponent(target)}`;

test('rejects arbitrary hosts, paths, methods and cross-site requests before forwarding', async (t) => {
  const network = t.mock.method(globalThis, 'fetch', () => { throw new Error('Must not reach the network'); });
  for (const [target, method] of [[`${endpoint}.evil.example/v1/videos`, 'POST'], [`${endpoint}/api/user`, 'GET'], [`${endpoint}/v1/videos`, 'DELETE'], [`${endpoint}/v1/videos/task_A%2fcontent`, 'GET'], [`https://user:pass@openai.2yanx.dpdns.org/v1/videos`, 'POST']]) {
    const response = await onRequest({ request: new Request(proxyUrl(target), { method, headers: { Authorization: 'Bearer test-only' } }) });
    assert.equal(response.status, 403);
  }
  const crossSite = await onRequest({ request: new Request(proxyUrl(`${endpoint}/v1/videos/task_A`), { headers: { Origin: 'https://evil.example', Authorization: 'Bearer test-only' } }) });
  assert.equal(crossSite.status, 403);
  assert.equal(network.mock.callCount(), 0);
});

test('forwards customer auth and streams SSE without sending cookies or buffering the result', async (t) => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('data: {"status":"processing"}\n\n')); controller.close(); } });
  t.mock.method(globalThis, 'fetch', async (target, options) => {
    assert.equal(target.origin, endpoint);
    assert.equal(options.headers.get('Authorization'), 'Bearer test-only');
    assert.equal(options.headers.get('Cookie'), null);
    assert.equal(options.redirect, 'manual');
    assert.equal(await new Response(options.body).text(), '{"prompt":"test"}');
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Set-Cookie': 'private=1' } });
  });
  const response = await onRequest({ request: new Request(proxyUrl(`${endpoint}/v1/images/generations`), { method: 'POST', headers: { Origin: site, Authorization: 'Bearer test-only', 'Content-Type': 'application/json', Cookie: 'session=secret' }, body: '{"prompt":"test"}' }) });
  assert.equal(response.body, stream);
  assert.equal(response.headers.get('Content-Type'), 'text/event-stream');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.match(await response.text(), /processing/);
});

test('requires a customer key and preserves upstream authentication errors and HEAD headers', async (t) => {
  const requestUrl = proxyUrl(`${endpoint}/v1/videos/task_A/content`);
  assert.equal((await onRequest({ request: new Request(requestUrl) })).status, 401);
  t.mock.method(globalThis, 'fetch', async (_, options) => options.method === 'HEAD'
    ? new Response(null, { headers: { 'Content-Type': 'video/mp4', 'Content-Length': '1234' } })
    : Response.json({ error: { message: 'Invalid key' } }, { status: 401 }));
  const response = await onRequest({ request: new Request(requestUrl, { headers: { Authorization: 'Bearer test-only' } }) });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.message, 'Invalid key');
  const head = await onRequest({ request: new Request(requestUrl, { method: 'HEAD', headers: { Authorization: 'Bearer test-only' } }) });
  assert.equal(head.body, null);
  assert.equal(head.headers.get('Content-Length'), '1234');
});
