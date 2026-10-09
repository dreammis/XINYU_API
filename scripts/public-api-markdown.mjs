import { operationExamples, requestCode, resolveSchema, responseExampleFor } from '../site/.vitepress/theme/openapi-content.mjs';

// 网站复制/Markdown 导出同样使用页面的模式配对规则；仅输出客户契约，不包含维护资料。
export function publicApiMarkdown(spec, endpoint, method, locale, model) {
  const zh = locale === 'zh';
  const operation = spec.paths[endpoint][method];
  const lines = [`# ${zh ? operation['x-title-zh'] ?? operation.summary : operation.summary}${model ? ` · ${model}` : ''}`, '', `\`${method.toUpperCase()} ${endpoint}\``, '', zh ? operation['x-description-zh'] ?? operation.description ?? '' : operation.description ?? '', '', '## ' + (zh ? '鉴权' : 'Authentication'), '', '`Authorization: Bearer YOUR_API_KEY`', ''];
  const parameters = [...(spec.paths[endpoint].parameters ?? []), ...(operation.parameters ?? [])];
  if (parameters.length) lines.push('## ' + (zh ? '路径、查询与请求头' : 'Parameters'), '', '```json', JSON.stringify(parameters, null, 2), '```', '');
  const types = Object.keys(operation.requestBody?.content ?? {});
  for (const type of types) lines.push(`## ${zh ? '请求体' : 'Request body'} · ${type}`, '', '```json', JSON.stringify(resolveSchema(spec, operation.requestBody.content[type].schema), null, 2), '```', '');
  for (const type of types.length ? types : ['application/json']) {
    for (const mode of operationExamples(spec, operation, type, model)) {
      lines.push(`## ${zh ? '调用示例' : 'Request example'} · ${type} · ${mode.title[locale]}`, '');
      if (!types.length || mode.example !== undefined) lines.push('```bash', requestCode({ spec, endpoint, method, mediaType: type, example: mode.example }).curl, '```', '');
      else lines.push(zh ? '公开契约未提供完整请求样例。' : 'The public contract has no complete request example.', '');
      const status = Object.keys(operation.responses).find(value => /^2/.test(value));
      const responseTypes = Object.keys(operation.responses[status]?.content ?? {});
      const responseType = responseTypes.includes(mode.responseType) ? mode.responseType : responseTypes[0];
      const value = responseExampleFor(operation, status, responseType, mode.example);
      lines.push(`### ${zh ? '对应响应' : 'Matching response'} · ${status}${responseType ? ` · ${responseType}` : ''}`, '');
      if (value !== undefined) lines.push(typeof value === 'string' ? '```text' : '```json', typeof value === 'string' ? value : JSON.stringify(value, null, 2), '```', '');
      else lines.push(zh ? '未交付完整响应样例，请按下面的响应定义与使用指南处理。' : 'No complete response example was supplied. Follow the schema and usage guide.', '');
    }
  }
  lines.push('## ' + (zh ? '响应定义' : 'Response definitions'), '', '```json', JSON.stringify(operation.responses, null, 2), '```', '', '## ' + (zh ? '引用结构' : 'Referenced schemas'), '', '```json', JSON.stringify(spec.components.schemas ?? {}, null, 2), '```', '');
  return lines.join('\n');
}
