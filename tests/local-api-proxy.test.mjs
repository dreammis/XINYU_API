import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import test from 'node:test';
import {localApiProxy} from '../site/.vitepress/vite-api-proxy.mjs';

// 通过真正的 Node HTTP 验收本地桥接；上游 fetch 模拟，绝不发送付费生成。
test('local proxy reuses Pages authorization and streams authenticated request/response bytes', async () => {
  const original = globalThis.fetch;
  const server = http.createServer((request,response) => localApiProxy(request,response,()=>{response.writeHead(404);response.end();}));
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  const port=server.address().port;
  const path='/api-proxy?scalar_url='+encodeURIComponent('https://openai.2yanx.dpdns.org/tts/v1/tasks');
  function request(headers={}) {
    return new Promise((resolve,reject)=>{
      const req=http.request({hostname:'127.0.0.1',port,path,method:'POST',headers},res=>{
        const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString(),type:res.headers['content-type']}));
      });req.on('error',reject);req.end('{"model":"vox-1"}');
    });
  }
  try {
    globalThis.fetch=()=>{throw new Error('unauthenticated request reached upstream');};
    assert.equal((await request()).status,401);
    globalThis.fetch=async(url,init)=>{
      assert.equal(init.headers.get('Authorization'),'Bearer test-only');
      assert.equal(await new Response(init.body).text(),'{"model":"vox-1"}');
      return new Response('event: complete\ndata: {}\n\n',{headers:{'Content-Type':'text/event-stream'}});
    };
    const response=await request({Authorization:'Bearer test-only','Content-Type':'application/json'});
    assert.equal(response.status,200);assert.equal(response.type,'text/event-stream');assert.equal(response.text,'event: complete\ndata: {}\n\n');
  } finally {globalThis.fetch=original;server.close();await once(server,'close');}
});
