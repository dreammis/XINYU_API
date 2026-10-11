import assert from 'node:assert/strict';
// 在真实构建页面读取原生弹窗及始终可见的参数说明；浏览器工具执行，不发送 API 请求。
export function inspectClientLayout() {
  const client = document.querySelector('dialog.request-dialog[open]');
  if (!client) throw new Error('API playground is not open');
  const rect = client.getBoundingClientRect();
  return {
    inDocument: Boolean(client.closest('.vp-doc')),
    hostCount: document.querySelectorAll('dialog.request-dialog').length,
    clientCount: document.querySelectorAll('dialog.request-dialog[open]').length,
    background: getComputedStyle(client).backgroundColor,
    bodyLocked: document.body.style.overflow === 'hidden',
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    viewport: { width: innerWidth, height: innerHeight },
    text: client.innerText,
    code: client.querySelector('[role=tabpanel]')?.textContent,
    model: client.querySelector('select:disabled')?.value,
    descriptions: [...client.querySelectorAll('.label-element')].map(el => ({ text: el.textContent, display: getComputedStyle(el).display })),
    files: client.querySelectorAll('input[type=file]').length,
  };
}
export function assertUnseededUpload(state) {
  assert.ok(state.files > 0);
  assert.ok(state.code.includes('model'));
  for (const name of ['image', 'image[]', 'input_reference', 'stream', 'delivery', 'progress', 'size', 'resolution']) assert.ok(!state.code.includes(`"${name}"`), `Optional ${name} is not silently seeded`);
}
// 覆盖正文污染、透明背景、重复弹窗、视口溢出与说明被隐藏的真实故障。
export function assertClientLayout(state, endpoint) {
  assert.equal(state.inDocument, false);
  assert.equal(state.hostCount, 1);
  assert.equal(state.clientCount, 1);
  assert.equal(state.bodyLocked, true);
  assert.notEqual(state.background, 'rgba(0, 0, 0, 0)');
  assert.ok(state.rect.width > 0 && state.rect.height > 0);
  assert.ok(state.rect.x >= -1 && state.rect.y >= -1);
  assert.ok(state.rect.x + state.rect.width <= state.viewport.width + 1);
  assert.ok(state.rect.y + state.rect.height <= state.viewport.height + 1);
  assert.ok(state.descriptions.length > 0);
  assert.ok(state.descriptions.every(item => item.display !== 'none'));
  if (endpoint) assert.ok(state.text.includes(endpoint));
}
