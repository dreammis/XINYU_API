// 规范引用按 JSON Pointer 解析，展示和示例使用同一个原始 schema。
export function resolveSchema(spec, schema = {}) {
  if (!schema.$ref) return schema;
  const target = schema.$ref.slice(2).split('/').reduce((value, key) => value?.[key.replaceAll('~1', '/').replaceAll('~0', '~')], spec);
  if (!target) throw new Error(`Unresolved schema: ${schema.$ref}`);
  return { ...target, ...Object.fromEntries(Object.entries(schema).filter(([key]) => key !== '$ref')) };
}

// 只有请求模型枚举明确包含该名称，才能将一个操作列为此模型的调用入口。
export function modelOperations(spec, model) {
  return Object.entries(spec.paths).flatMap(([endpoint, item]) => ['get', 'post', 'put', 'patch', 'delete', 'head'].filter((method) => item[method]).flatMap((method) => {
    const operation = item[method];
    const supported = Object.values(operation.requestBody?.content ?? {}).some((body) => resolveSchema(spec, resolveSchema(spec, body.schema).properties?.model).enum?.includes(model));
    return supported ? [{ endpoint, method, operation }] : [];
  }));
}

// 只采用契约已交付的示例，不根据字段名捏造必填参数或成功结果。
export function requestExample(spec, body, model) {
  const schema = resolveSchema(spec, body?.schema);
  const example = body?.example ?? Object.values(body?.examples ?? {}).find((item) => item.value !== undefined)?.value ?? schema.example;
  if (example === undefined) return undefined;
  let value = structuredClone(example);
  if (model && value && typeof value === 'object' && schema.properties?.model) {
    // 换模型不能沿用其他模型的尺寸、时长和质量。模型页只保留已交付示例的必填字段。
    const required = new Set(schema.required ?? []);
    // Responses 的 input/prompt 由 oneOf 声明必填，不能在最小示例中丢掉。
    for (const branch of schema.oneOf ?? []) {
      if (branch.required?.every(key => value[key] !== undefined)) branch.required.forEach(key => required.add(key));
    }
    value = Object.fromEntries(Object.entries(value).filter(([key]) => key === 'model' || required.has(key)));
    value.model = model;
    if (schema.required?.some(key => value[key] === undefined)) return undefined;
  }
  return value;
}

// 模式只使用公开 schema 已声明的开关。切换模型时从必填示例重新开始，避免继承尺寸与时长。
export function operationExamples(spec, operation, mediaType, model) {
  const body = operation.requestBody?.content?.[mediaType];
  const schema = resolveSchema(spec, body?.schema);
  const source = requestExample(spec, body);
  const minimal = requestExample(spec, body, model ?? source?.model);
  if (minimal && typeof minimal === 'object') {
    for (const key of ['stream', 'delivery', 'progress', 'background']) if (!schema.required?.includes(key)) delete minimal[key];
  }
  const examples = [{ id: 'json', example: minimal, responseType: 'application/json', title: { zh: '普通 JSON', en: 'JSON' } }];
  if (minimal && schema.properties?.stream && Object.values(operation.responses).some(response => response.content?.['text/event-stream'])) {
    examples.push({ id: 'stream', example: { ...minimal, stream: true }, responseType: 'text/event-stream', title: { zh: '流式 SSE', en: 'SSE stream' } });
    if (schema.properties.delivery?.const === 'url') examples.push({ id: 'stream-url', example: { ...minimal, stream: true, delivery: 'url' }, responseType: 'text/event-stream', title: { zh: '流式 SSE · URL 交付', en: 'SSE · URL delivery' } });
  }
  if (minimal && schema.properties?.background) examples.push({ id: 'background', example: { ...minimal, background: true }, responseType: 'application/json', title: { zh: '后台任务', en: 'Background task' } });
  return examples;
}

// 成功结果必须与当前请求交付方式一致；缺少对应样例就明确显示缺失，不能借用其他模式的结果。
export function responseExampleFor(operation, status, mediaType, example) {
  const body = operation.responses[status]?.content?.[mediaType];
  const values = [body?.example, ...Object.values(body?.examples ?? {}).map(item => item.value)].filter(value => value !== undefined);
  return values.find(value => {
    if (!/^2/.test(status)) return true;
    if (typeof value === 'string' && value.includes('event: image_url.completed')) return example?.delivery === 'url';
    if (typeof value === 'string' && /event: image_(generation|edit)\.completed/.test(value)) return example?.delivery !== 'url';
    if (mediaType === 'application/json' && example?.response_format === 'b64_json') return value?.data?.some(item => item.b64_json);
    return true;
  });
}

// 代码示例中的凭据始终为占位符；文件、流式与 JSON 采用各自的读取方式。
export function requestCode({ spec, endpoint, method, mediaType, example }) {
  const url = `${spec.servers[0].url.replace(/\/$/, '')}${endpoint.replace(/\{([^}]+)\}/g, (_, name) => `YOUR_${name.toUpperCase()}`)}`;
  const hasBody = example !== undefined;
  const multipart = mediaType === 'multipart/form-data';
  const operation = spec.paths[endpoint][method];
  const bodySchema = resolveSchema(spec, operation.requestBody?.content?.[mediaType]?.schema);
  const binary = method !== 'head' && Object.keys(operation.responses?.['200']?.content ?? {}).some((type) => type.startsWith('video/') || type === 'application/octet-stream');
  const stream = example?.stream === true || (multipart && example?.stream === 'true');
  const json = JSON.stringify(example, null, 2);
  const quote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;
  const curl = [`curl${stream ? ' -N' : ''} -X ${method.toUpperCase()} ${quote(url)}`, '  -H "Authorization: Bearer YOUR_API_KEY"'];
  const python = ['import requests', '', `url = ${JSON.stringify(url)}`, 'headers = {"Authorization": "Bearer YOUR_API_KEY"}'];
  const javascript = [];
  if (hasBody && multipart) {
    javascript.push('const form = new FormData();');
    const data = {};
    const files = {};
    for (const [name, value] of Object.entries(example)) {
      const field = resolveSchema(spec, bodySchema.properties?.[name]);
      const file = field.format === 'binary' || (field.type === 'array' && resolveSchema(spec, field.items).format === 'binary');
      if (file) {
        curl.push(`  -F ${quote(`${name}=@reference.png`)}`);
        files[name] = 'reference.png';
        javascript.push(`form.append(${JSON.stringify(name)}, new Blob([await (await import('node:fs/promises')).readFile('reference.png')]), 'reference.png');`);
      } else {
        const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
        data[name] = text;
        curl.push(`  -F ${quote(`${name}=${text}`)}`);
        javascript.push(`form.append(${JSON.stringify(name)}, ${JSON.stringify(text)});`);
      }
    }
    python.push(`data = ${JSON.stringify(data)}`, `files = {name: open(filename, "rb") for name, filename in ${JSON.stringify(files)}.items()}`, `response = requests.${method}(url, headers=headers, data=data, files=files${stream || binary ? ', stream=True' : ''})`);
  } else if (hasBody) {
    curl.push(`  -H ${quote(`Content-Type: ${mediaType}`)}`, `  -d ${quote(json)}`);
    python.unshift('import json');
    python.push(`payload = json.loads(r'''${json.replaceAll("'''", '\\u0027\\u0027\\u0027')}''')`, `response = requests.${method}(url, headers=headers, json=payload${stream || binary ? ', stream=True' : ''})`);
    javascript.push(`const payload = ${json};`);
  } else {
    python.push(`response = requests.${method}(url, headers=headers${binary ? ', stream=True' : ''})`);
  }
  javascript.push(`const response = await fetch(${JSON.stringify(url)}, {`, `  method: '${method.toUpperCase()}',`, `  headers: { Authorization: 'Bearer YOUR_API_KEY'${hasBody && !multipart ? `, 'Content-Type': '${mediaType}'` : ''} },`, ...(hasBody ? [`  body: ${multipart ? 'form' : 'JSON.stringify(payload)'},`] : []), '});', 'if (!response.ok) throw new Error(`HTTP ${response.status}`);');
  python.push('response.raise_for_status()');
  if (binary) {
    curl.push('  -o result.mp4');
    python.push('with open("result.mp4", "wb") as file:', '    for chunk in response.iter_content(65536):', '        file.write(chunk)');
    javascript.push("await (await import('node:fs/promises')).writeFile('result.mp4', new Uint8Array(await response.arrayBuffer()));");
  } else if (stream) {
    python.push('for line in response.iter_lines(decode_unicode=True):', '    if line:', '        print(line)');
    javascript.push('for await (const chunk of response.body) {', '  process.stdout.write(Buffer.from(chunk));', '}');
  } else if (method === 'head') {
    python.push('print(response.headers)');
    javascript.push('console.log(Object.fromEntries(response.headers));');
  } else {
    python.push('print(response.json())');
    javascript.push('console.log(await response.json());');
  }
  return { curl: curl.join(' \\\n'), python: python.join('\n'), javascript: javascript.join('\n') };
}
