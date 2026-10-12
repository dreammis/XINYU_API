// 调用方式来自公开契约和实际请求，不从 HTTP 200 或 JSON 格式猜测任务是否完成。
export function executionMode(operation, body) {
  if (body?.stream === true || body?.stream === 'true') return 'stream';
  const task = operation['x-playground-task'];
  if (task && (!task.when || Object.entries(task.when).every(([name, value]) => body?.[name] === value))) return 'async';
  return 'sync';
}

export const executionLabels = {
  sync: {zh: '同步 · 直接返回结果', en: 'Synchronous · direct result'},
  stream: {zh: '流式 · SSE 事件', en: 'Streaming · SSE events'},
  async: {zh: '异步 · 提交后查询任务', en: 'Asynchronous · submit and query'},
};

export function taskState(protocol, payload) {
  if (typeof payload.id !== 'string' || !payload.id || !protocol.states.includes(payload.status)) throw new Error('Invalid task ID or unknown task status');
  return {id: payload.id, status: payload.status, data: payload, complete: protocol.completed.includes(payload.status), failed: protocol.failed.includes(payload.status)};
}

export function streamOutcome(operation, event) {
  const protocol = operation['x-playground-stream'];
  if (!protocol) return null;
  let type = event.event;
  if (type === 'message' && event.data !== '[DONE]') {
    try {type = JSON.parse(event.data).type;} catch {return null;}
  }
  if (protocol.failed.includes(type)) return 'failed';
  if (protocol.completed.includes(type)) return 'completed';
  return null; // [DONE] 或连接关闭只表示传输结束，不能冒充生成成功。
}

// SSE 跨网络分块、CRLF 和多行 data 均须按事件边界解析；心跳不冒充业务事件。
export function createSseParser(onEvent) {
  let buffer = '';
  return chunk => {
    buffer += chunk;
    let boundary;
    while ((boundary = /\r\n\r\n|\n\n|\r\r/.exec(buffer))) {
      const block = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary[0].length);
      let event = 'message';
      const data = [];
      for (const line of block.split(/\r\n|\n|\r/)) {
        if (line.startsWith(':')) continue;
        const colon = line.indexOf(':');
        const name = colon < 0 ? line : line.slice(0, colon);
        const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
        if (name === 'event') event = value;
        if (name === 'data') data.push(value);
      }
      if (data.length) onEvent({event, data: data.join('\n')});
    }
  };
}
