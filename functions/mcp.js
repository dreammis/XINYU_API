import documents from '../site/public-documents.mjs';

const versions = ['2025-06-18', '2025-03-26'];
const tools = [
  { name: 'search_docs', description: 'Search published XY API customer documentation. Returns Markdown paths for read_document.', inputSchema: { type: 'object', properties: { query: { type: 'string', minLength: 1, maxLength: 200 }, locale: { type: 'string', enum: ['zh', 'en'] } }, required: ['query'], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
  { name: 'read_document', description: 'Read a published XY API customer Markdown document by the exact path returned by search_docs.', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
];

// 无会话的 Streamable HTTP 服务；仅读取构建时枚举的公开文档，不接收 Key、不转发 API 调用。
export async function onRequest({ request }) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (origin && origin !== url.origin) return new Response('Origin not allowed', { status: 403, headers });
  if (origin) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version' } });
  if (request.method !== 'POST') return new Response('Use Streamable HTTP POST; no server-initiated SSE stream.', { status: 405, headers: { ...headers, Allow: 'POST, GET, OPTIONS' } });
  const protocol = request.headers.get('MCP-Protocol-Version');
  if (protocol && !versions.includes(protocol)) return new Response('Unsupported MCP protocol version', { status: 400, headers });
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return new Response('Expected application/json', { status: 415, headers });
  if (!request.headers.get('Accept')?.includes('application/json') || !request.headers.get('Accept')?.includes('text/event-stream')) return new Response('Accept must include application/json and text/event-stream', { status: 406, headers });
  let message;
  // 在读取流时限制大小，避免先无限缓存再检查。公开文档请求不应超过 32 KiB。
  const reader = request.body?.getReader();
  if (!reader) return new Response('Missing JSON-RPC body', { status: 400, headers });
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 32768) { await reader.cancel(); return new Response('Request too large', { status: 413, headers }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    message = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch { return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers }); }
  finally { reader.releaseLock(); }
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const id = typeof message?.id === 'string' || Number.isInteger(message?.id) ? message.id : null;
  const fail = (code, description, status = 200) => Response.json({ jsonrpc: '2.0', id, error: { code, message: description } }, { status, headers });
  if (!object(message) || message.jsonrpc !== '2.0' || ('id' in message && id === null)) return fail(-32600, 'Invalid request', 400);
  // 通知或客户端响应按协议返回空 202；本服务不向客户端发起请求。
  if (!('id' in message)) {
    if (typeof message.method !== 'string' || !message.method.startsWith('notifications/')) return fail(-32600, 'Invalid notification', 400);
    return new Response(null, { status: 202, headers });
  }
  if (!('method' in message) && ('result' in message || 'error' in message)) return new Response(null, { status: 202, headers });
  if (typeof message.method !== 'string') return fail(-32600, 'Invalid request', 400);
  const params = message.params ?? {};
  if (!object(params)) return fail(-32602, 'Params must be an object');
  let result;
  switch (message.method) {
    case 'initialize':
      if (typeof params.protocolVersion !== 'string' || !object(params.capabilities) || !object(params.clientInfo) || typeof params.clientInfo.name !== 'string' || typeof params.clientInfo.version !== 'string') return fail(-32602, 'Invalid initialization parameters');
      result = { protocolVersion: versions.includes(params.protocolVersion) ? params.protocolVersion : versions[0], capabilities: { tools: {}, resources: {} }, serverInfo: { name: 'xyapi-docs', version: '1.0.0' }, instructions: 'Read-only public customer documentation. Model names are product routes. Generation APIs require a customer key and may charge; this server does not call them.' };
      break;
    case 'ping': result = {}; break;
    case 'tools/list': result = { tools }; break;
    case 'tools/call': {
      const args = params.arguments ?? {};
      if (!object(args)) return fail(-32602, 'Arguments must be an object');
      if (params.name === 'search_docs') {
        if (typeof args.query !== 'string' || !args.query.trim() || args.query.length > 200 || (args.locale !== undefined && !['zh', 'en'].includes(args.locale)) || Object.keys(args).some(key => !['query', 'locale'].includes(key))) return fail(-32602, 'Invalid search query or locale');
        const terms = args.query.trim().toLowerCase().split(/\s+/);
        const matches = documents.filter(doc => (!args.locale || doc.locale === args.locale) && terms.every(term => (doc.title + '\n' + doc.content).toLowerCase().includes(term))).map(doc => ({ path: doc.path, title: doc.title, locale: doc.locale, score: terms.filter(term => doc.title.toLowerCase().includes(term)).length })).sort((a, b) => b.score - a.score).slice(0, 12).map(({ score, ...doc }) => doc);
        result = { content: [{ type: 'text', text: JSON.stringify(matches) }] };
      } else if (params.name === 'read_document') {
        if (typeof args.path !== 'string' || Object.keys(args).some(key => key !== 'path')) return fail(-32602, 'Expected an exact public Markdown path');
        const doc = documents.find(doc => doc.path === args.path);
        result = { content: [{ type: 'text', text: doc ? doc.content : 'Document not found in published customer documentation.' }], ...(!doc ? { isError: true } : {}) };
      } else return fail(-32602, 'Unknown tool');
      break;
    }
    case 'resources/list':
      if (params.cursor !== undefined) return fail(-32602, 'No resource pagination cursor');
      result = { resources: documents.map(doc => ({ uri: `${url.origin}${doc.path}`, name: doc.title, mimeType: 'text/markdown' })) }; break;
    case 'resources/read': {
      const doc = documents.find(doc => `${url.origin}${doc.path}` === params.uri);
      if (!doc) return fail(-32002, 'Public document not found');
      result = { contents: [{ uri: params.uri, mimeType: 'text/markdown', text: doc.content }] }; break;
    }
    default: return fail(-32601, 'Method not found');
  }
  return Response.json({ jsonrpc: '2.0', id, result }, { headers });
}
