import endpoints from './public-endpoints.json' with { type: 'json' };

// 目的地和方法来自公开规范，不能把调试入口变成任意地址的开放代理。
const allowed = endpoints.map((endpoint) => ({
  ...endpoint,
  pattern: new RegExp(`^${endpoint.path.split(/(\{[^}]+\})/).map((part) => part.startsWith('{') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')}$`),
}));

export async function onRequest({ request }) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return Response.json({ error: 'Use the playground on this documentation site.' }, { status: 403 });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  const rawTarget = url.searchParams.get('scalar_url');
  let target;
  try { target = new URL(rawTarget); } catch { return Response.json({ error: 'Invalid API URL.' }, { status: 400 }); }
  if (target.username || target.password || target.hash || /%2f|%5c/i.test(target.pathname) || !allowed.some((endpoint) => endpoint.origin === target.origin && endpoint.method === request.method && endpoint.pattern.test(target.pathname))) {
    return Response.json({ error: 'This URL and method are not in the public API contract.' }, { status: 403 });
  }
  const authorization = request.headers.get('Authorization');
  if (!/^Bearer \S+$/i.test(authorization ?? '')) return Response.json({ error: 'Enter your API key in the authentication field.' }, { status: 401 });
  const headers = new Headers({ Authorization: authorization });
  for (const name of ['Content-Type', 'Accept', 'Range']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    // 原样流式转发 multipart、SSE 和文件；不记录、持久化密钥或缓存响应。
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      duplex: 'half',
      redirect: 'manual',
      signal: request.signal,
    });
    if (upstream.status >= 300 && upstream.status < 400) return Response.json({ error: 'The API returned a redirect. Use your own client to follow it.' }, { status: 502 });
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    for (const name of ['Content-Type', 'Content-Encoding', 'Content-Disposition', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'X-Request-Id']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
  } catch {
    return Response.json({ error: 'Unable to connect to the API.' }, { status: 502 });
  }
}
