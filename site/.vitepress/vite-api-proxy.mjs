import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {onRequest} from '../../functions/api-proxy.js';

// 本地 Vite 将 Node HTTP 转为 Web Request，复用 Pages 的鉴权/白名单/流式处理，不另写转发规则。
export async function localApiProxy(request, response, next) {
  if (request.url.split('?')[0] !== '/api-proxy') return next();
  const abort = new AbortController();
  response.on('close', () => {if (!response.writableEnded) abort.abort();});
  request.on('aborted', () => abort.abort());
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    const result = await onRequest({request: new Request(new URL(request.url, `http://${request.headers.host}`), {
      method: request.method, headers, signal: abort.signal,
      ...(!['GET', 'HEAD'].includes(request.method) ? {body: Readable.toWeb(request), duplex: 'half'} : {}),
    })});
    response.writeHead(result.status, Object.fromEntries(result.headers));
    if (result.body) await pipeline(Readable.fromWeb(result.body), response);
    else response.end();
  } catch {
    if (!response.headersSent) response.writeHead(502, {'Content-Type':'application/json'});
    response.end('{"error":"Local API proxy connection failed."}');
  }
}

export default {name: 'local-api-proxy', configureServer(server) {server.middlewares.use(localApiProxy);}};
