import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { resolveSchema } from './openapi-content.mjs';
import { parameterDescription, schemaConstraints, schemaRules } from './schema-presentation.mjs';

// JSON Forms 使用完整的契约校验；不自动填可选默认值，避免悄悄开启增强、流式或互斥输入。
export function createRequestValidator() {
  const ajv = new Ajv({ allErrors: true, strict: false, useDefaults: false });
  addFormats(ajv);
  ajv.addKeyword({ keyword: 'x-api-file', validate: (_, value) => typeof File !== 'undefined' && value instanceof File });
  return ajv;
}

// 只转换展示语言和浏览器文件类型。if/then、oneOf 和模型限制仍由原始 JSON Schema 校验。
export function requestFormDefinition({ spec, endpoint, method, mediaType, model, locale }) {
  const zh = locale === 'zh';
  const item = spec.paths[endpoint];
  const operation = item[method];
  function schemaFor(original, seen = []) {
    if (typeof original === 'boolean') return original;
    if (original?.$ref && seen.includes(original.$ref)) throw new Error(`Recursive request schema: ${original.$ref}`);
    const schema = structuredClone(resolveSchema(spec, original));
    const next = original?.$ref ? [...seen, original.$ref] : seen;
    if (zh && schema['x-description-zh']) schema.description = schema['x-description-zh'];
    if (schema.format === 'binary' && mediaType === 'multipart/form-data') {
      delete schema.format;
      schema.type = 'object';
      schema['x-api-file'] = true;
    }
    for (const key of ['properties', 'patternProperties', '$defs', 'dependentSchemas']) {
      if (schema[key]) schema[key] = Object.fromEntries(Object.entries(schema[key]).map(([name, value]) => [name, schemaFor(value, next)]));
    }
    for (const key of ['items', 'additionalProperties', 'if', 'then', 'else', 'not', 'contains']) if (schema[key] && typeof schema[key] === 'object') schema[key] = schemaFor(schema[key], next);
    for (const key of ['allOf', 'oneOf', 'anyOf', 'prefixItems']) if (schema[key]) schema[key] = schema[key].map(value => schemaFor(value, next));
    // 开源组合控件默认显示 oneOf-0；改用规范中的类型/标题和约束，避免客户猜选项含义。
    for (const branch of schema.oneOf ?? []) {
      if (branch.title || !branch.type) continue;
      const types = zh ? { integer: '整数', number: '数字', string: '字符串', array: '数组', object: '对象', boolean: '布尔值' } : {};
      branch.title = [types[branch.type] ?? branch.type, ...schemaConstraints(branch, locale)].join(' · ');
    }
    return schema;
  }
  const properties = {};
  const combined = new Map();
  for (const parameter of [...(item.parameters ?? []), ...(operation.parameters ?? [])]) combined.set(`${parameter.in}/${parameter.name}`, parameter);
  for (const parameter of combined.values()) {
    if (!['path', 'query', 'header'].includes(parameter.in)) throw new Error(`Unsupported parameter location: ${parameter.in}`);
    const group = properties[parameter.in] ??= { type: 'object', properties: {}, required: [], additionalProperties: false };
    group.properties[parameter.name] = { ...schemaFor(parameter.schema), description: parameterDescription(parameter, locale) };
    if (parameter.required) group.required.push(parameter.name);
  }
  const content = operation.requestBody?.content?.[mediaType];
  if (content) {
    properties.body = schemaFor(content.schema);
    if (model && properties.body.properties?.model) {
      properties.body.properties.model.enum = [model];
      properties.body.properties.model.description ??= zh ? '本页选定的模型调用名称。' : 'The model route selected on this page.';
    }
  }
  const titles = zh ? { path: '路径参数', query: '查询参数', header: '请求头', body: '请求体' } : { path: 'Path parameters', query: 'Query parameters', header: 'Headers', body: 'Request body' };
  const pointer = name => name.replaceAll('~', '~0').replaceAll('/', '~1');
  function layout(schema, scope) {
    if (!schema.properties) return [{ type: 'Control', scope, label: false }];
    const rules = schemaRules(schema, locale);
    const notes = [schema.description, ...(rules.length ? [zh ? '组合与模型限制' : 'Input and model rules', ...rules] : []), ...(schema.additionalProperties === false ? [zh ? '不接受未列出的字段。' : 'Additional properties are not allowed.'] : [])].filter(Boolean);
    return [...(notes.length ? [{ type: 'Label', text: notes.join('\n'), options: { styles: { label: { root: 'request-schema-notes' } } } }] : []), ...Object.entries(schema.properties).map(([name, field]) => {
      const fieldScope = `${scope}/properties/${pointer(name)}`;
      const type = field['x-api-file'] ? (zh ? '文件' : 'file') : field.type ?? (field.oneOf ? 'oneOf' : 'object');
      const hints = schemaConstraints(field, locale);
      if (field.enum) hints.push(`${zh ? '可选值' : 'Allowed values'}: ${JSON.stringify(field.enum)}`);
      const description = [field.description, ...hints].filter(Boolean).join('\n');
      const controls = field.properties && !field['x-api-file']
        ? [{ type: 'Group', label: `${name} · ${type}`, elements: layout(field, fieldScope) }]
        : [{ type: 'Control', scope: fieldScope, label: `${name} · ${type}`, options: { locale, multi: name === 'text' || name === 'prompt', ...(field.type === 'integer' ? { step: 1 } : {}), showUnfocusedDescription: false, apiFile: Boolean(field['x-api-file'] || field.items?.['x-api-file']), apiFileArray: Boolean(field.items?.['x-api-file']), readonly: field.readOnly || (name === 'model' && Boolean(model)) } }];
      // 说明独立于输入组件，校验错误出现时也保留；数组和对象同样显示说明与约束。
      return { type: 'VerticalLayout', options: { styles: { verticalLayout: { root: 'request-field' } } }, elements: [...controls, ...(description ? [{ type: 'Label', text: description }] : [])] };
    })];
  }
  return {
    schema: { type: 'object', properties, required: Object.entries(properties).filter(([name, value]) => name === 'body' ? operation.requestBody.required : value.required?.length).map(([name]) => name), additionalProperties: false },
    uischema: { type: 'VerticalLayout', elements: Object.entries(properties).map(([name, schema]) => ({ type: 'Group', label: `${titles[name]}${name === 'body' ? ` · ${mediaType}` : ''}`, elements: layout(schema, `#/properties/${name}`) })) },
    parameters: [...combined.values()],
  };
}

// 预填只来自当前模式的公开示例。没有完整上传示例时，只预填已选模型，其余由客户填写。
export function requestFormData({ example, model, parameters, hasBody }) {
  const data = {};
  for (const parameter of parameters) {
    if (!parameter.required) continue;
    const value = parameter.example ?? parameter.schema?.example;
    if (value !== undefined) (data[parameter.in] ??= {})[parameter.name] = structuredClone(value);
  }
  if (hasBody) data.body = example === undefined ? (model ? { model } : {}) : structuredClone(example);
  return data;
}

// 发送与预览共用同一 URL/请求头；文件保留 File 实例，FormData 自行生成 multipart boundary。
export function buildPlaygroundRequest({ spec, endpoint, method, mediaType, data, apiKey }) {
  const path = endpoint.replace(/\{([^}]+)\}/g, (_, name) => {
    const value = data.path?.[name];
    if (value === undefined || value === '') throw new Error(`Missing path parameter: ${name}`);
    return encodeURIComponent(String(value));
  });
  const url = new URL(spec.servers[0].url.replace(/\/$/, '') + path);
  const parameters = [...(spec.paths[endpoint].parameters ?? []), ...(spec.paths[endpoint][method].parameters ?? [])];
  for (const [name, value] of Object.entries(data.query ?? {})) {
    if (value === undefined) continue;
    const parameter = parameters.find(item => item.in === 'query' && item.name === name);
    if (Array.isArray(value)) {
      if (parameter?.explode === false) url.searchParams.set(name, value.join(','));
      else value.forEach(item => url.searchParams.append(name, String(item)));
    } else if (value && typeof value === 'object') {
      if (parameter?.style !== 'deepObject') throw new Error(`Unsupported query object encoding: ${name}`);
      Object.entries(value).forEach(([key, item]) => url.searchParams.set(`${name}[${key}]`, String(item)));
    } else url.searchParams.set(name, String(value));
  }
  const headers = new Headers({ Authorization: `Bearer ${apiKey.trim().replace(/^Bearer\s+/i, '')}`, Accept: data.body?.stream === true || data.body?.stream === 'true' ? 'text/event-stream' : '*/*' });
  for (const [name, value] of Object.entries(data.header ?? {})) if (value !== undefined) headers.set(name, String(value));
  let body;
  if (data.body !== undefined && !['get', 'head'].includes(method)) {
    if (mediaType === 'multipart/form-data') {
      body = new FormData();
      for (const [name, value] of Object.entries(data.body)) {
        if (value === undefined) continue;
        if (value instanceof File) body.append(name, value, value.name);
        else if (Array.isArray(value) && value.every(item => item instanceof File)) value.forEach(file => body.append(name, file, file.name));
        else body.append(name, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    } else {
      if (mediaType !== 'application/json') throw new Error(`Unsupported body media type: ${mediaType}`);
      headers.set('Content-Type', mediaType);
      body = JSON.stringify(data.body);
    }
  }
  return { url: url.href, init: { method: method.toUpperCase(), headers, body, credentials: 'omit', redirect: 'error', cache: 'no-store' } };
}
