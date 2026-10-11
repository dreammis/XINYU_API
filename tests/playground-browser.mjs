import assert from 'node:assert/strict';

// 在真实构建页面中读取弹窗，交给浏览器工具执行；不发送任何 API 请求。
export function inspectClientLayout() {
  const host = document.querySelector('.api-modal-host');
  const root = host?.querySelector('.scalar.z-overlay');
  const client = host?.querySelector('.scalar-client');
  if (!host || !root || !client) throw new Error('API client has not mounted');
  const rect = client.getBoundingClientRect();
  return {
    inDocument: Boolean(host.closest('.vp-doc')),
    hostCount: document.querySelectorAll('.api-modal-host').length,
    clientCount: document.querySelectorAll('.scalar-container.scalar-client--open').length,
    theme: host.closest('.light-mode, .dark-mode')?.className ?? '',
    position: getComputedStyle(root).position,
    zIndex: Number(getComputedStyle(root).zIndex),
    background: getComputedStyle(client).backgroundColor,
    themeBackground: getComputedStyle(client).getPropertyValue('--scalar-background-1').trim(),
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    viewport: { width: innerWidth, height: innerHeight },
    text: client.innerText,
    body: client.querySelector('.cm-content')?.textContent ?? '',
    checkedFields: [...client.querySelectorAll('input[type="checkbox"]')].filter(input => input.checked).map(input => input.getAttribute('aria-label') ?? ''),
  };
}

// 上传契约没有完整示例时，不能凭 schema 造出互斥的输入或主动开启流式计费请求。
export function assertUnseededUpload(state) {
  for (const name of ['model', 'prompt']) assert.ok(state.checkedFields.some(label => label.endsWith(` ${name}`) || label.endsWith(` ${name} in request`)), `Required upload field: ${name}`);
  for (const name of ['size', 'resolution', 'aspect_ratio', 'quality', 'n', 'response_format', 'enhance', 'stream', 'partial_images', 'delivery', 'image', 'image[]', 'progress']) {
    assert.ok(!state.checkedFields.some(label => label.endsWith(` ${name}`) || label.endsWith(` ${name} in request`)), `Optional upload field requires user selection: ${name}`);
  }
}

// 回归截图中的真实故障：透明背景、层级失效、正文污染和视口溢出都应失败。
export function assertClientLayout(state, endpoint) {
  assert.equal(state.inDocument, false, 'Client must be outside document typography');
  assert.equal(state.hostCount, 1, 'One host per API page');
  assert.equal(state.clientCount, 1, 'One open client');
  assert.match(state.theme, /(?:light|dark)-mode/, 'Scalar theme is required');
  assert.equal(state.position, 'relative', 'Scalar root utilities must apply');
  assert.ok(state.zIndex >= 100, 'Client must cover the documentation navigation');
  assert.notEqual(state.background, 'rgba(0, 0, 0, 0)', 'Client must have an opaque background');
  assert.ok(state.themeBackground, 'Theme background variable is required');
  assert.ok(state.rect.width > 0 && state.rect.height > 0, 'Client must be visible');
  assert.ok(state.rect.x >= -1 && state.rect.y >= -1, 'Client stays within the viewport');
  assert.ok(state.rect.x + state.rect.width <= state.viewport.width + 1, 'No horizontal overflow');
  assert.ok(state.rect.y + state.rect.height <= state.viewport.height + 1, 'No vertical overflow');
  if (endpoint) assert.ok(state.text.includes(endpoint), `Selected endpoint: ${endpoint}`);
}
