// 正文和调试表单共用约束说明，避免相同规范在两处展示不同的范围与组合规则。
export function schemaRules(schema, locale) {
  const zh = locale === 'zh';
  const lines = [];
  function condition(value) {
    const parts = (value.required ?? []).map(name => zh ? `提供 ${name}` : `${name} is present`);
    for (const [name, field] of Object.entries(value.properties ?? {})) {
      if ('const' in field) parts.push(`${name} = ${JSON.stringify(field.const)}`);
      else if (field.enum) parts.push(`${name} ${zh ? '为' : 'is one of'} ${field.enum.map(value => JSON.stringify(value)).join(', ')}`);
      else if (field.required) parts.push(...field.required.map(key => zh ? `提供 ${name}.${key}` : `${name}.${key} is present`));
    }
    return parts.join(zh ? '，且 ' : ' and ');
  }
  function restriction(value) {
    const parts = [];
    if (value.required?.length) parts.push(`${zh ? '必须提供' : 'requires'} ${value.required.join(', ')}`);
    for (const [name, field] of Object.entries(value.properties ?? {})) {
      if ('const' in field) parts.push(`${name} ${zh ? '必须为' : 'must be'} ${JSON.stringify(field.const)}`);
      else if (field.enum) parts.push(`${name} ${zh ? '仅接受' : 'accepts only'} ${field.enum.map(value => JSON.stringify(value)).join(', ')}`);
      else if (field.pattern) parts.push(`${name} ${zh ? '须匹配' : 'must match'} ${field.pattern}`);
      else if (field.oneOf) parts.push(`${name}: ${field.oneOf.map(branch => branch.minimum !== undefined || branch.maximum !== undefined ? `${branch.minimum ?? '−∞'}–${branch.maximum ?? '∞'}` : branch.pattern ?? branch.type).join(zh ? ' 或 ' : ' or ')}`);
    }
    if (value.not?.required) parts.push(`${zh ? '不能同时提供' : 'cannot combine'} ${value.not.required.join(', ')}`);
    for (const branch of value.not?.anyOf ?? []) { const text = condition(branch); if (text) parts.push(`${zh ? '不能' : 'must not'} ${text}`); }
    return parts.join(zh ? '；' : '; ');
  }
  // 只解释能从原始条件直接读出的规则，不从字段名推断业务事实。
  for (const branch of [schema, ...(schema.allOf ?? [])]) {
    if (branch.not?.required) lines.push(`${zh ? '不能同时提供' : 'Cannot combine'} ${branch.not.required.join(', ')}.`);
    if (branch.if && branch.then) {
      const when = condition(branch.if);
      const then = restriction(branch.then);
      if (when && then) lines.push(`${zh ? '当' : 'When'} ${when}: ${then}${branch.else && restriction(branch.else) ? `${zh ? '；否则' : '; otherwise'} ${restriction(branch.else)}` : ''}.`);
    }
  }
  if (schema.oneOf?.every(branch => branch.required?.length)) lines.push(`${zh ? '必须选择且只选择一种输入方案' : 'Choose exactly one input option'}: ${schema.oneOf.map(branch => branch.required.join(' + ')).join(zh ? ' 或 ' : ' or ')}.`);
  return lines;
}

// 显式保留 0、false 和严格上下界；展示不修改校验规则或默认请求。
export function schemaConstraints(schema, locale) {
  const labels = locale === 'zh' ? { minimum: '最小值', maximum: '最大值', exclusiveMinimum: '大于', exclusiveMaximum: '小于', minLength: '最少字符', maxLength: '最多字符', minItems: '最少条数', maxItems: '最多条数', pattern: '匹配规则', format: '格式', default: '默认', const: '固定值' } : { minimum: 'Minimum', maximum: 'Maximum', exclusiveMinimum: 'Greater than', exclusiveMaximum: 'Less than', minLength: 'Minimum characters', maxLength: 'Maximum characters', minItems: 'Minimum items', maxItems: 'Maximum items', pattern: 'Pattern', format: 'Format', default: 'Default', const: 'Fixed value' };
  return Object.entries(schema).filter(([key]) => ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'pattern', 'format', 'default', 'const'].includes(key)).map(([key, value]) => `${labels[key] ?? key}: ${JSON.stringify(value)}`);
}

// 正文与输入框使用同一字段说明；来源缺少业务说明时只解释确定的传输位置。
export function parameterDescription(parameter, locale) {
  const zh = locale === 'zh';
  const locationHint = parameter.in === 'path'
    ? (zh ? `填写后替换接口地址中的 {${parameter.name}}。` : `Replaces {${parameter.name}} in the endpoint URL.`)
    : parameter.in === 'query' ? (zh ? '填写后作为查询参数附加到请求地址。' : 'Added as a query parameter to the request URL.')
    : (zh ? '填写后作为请求头发送。' : 'Sent as an HTTP request header.');
  return [zh ? parameter['x-description-zh'] ?? parameter.description : parameter.description, locationHint].filter(Boolean).join('\n');
}

