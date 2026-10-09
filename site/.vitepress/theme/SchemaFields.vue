<script setup>
import { computed } from 'vue';
import { resolveSchema } from './openapi-content.mjs';
const props = defineProps({ spec: Object, schema: Object, locale: String, depth: { type: Number, default: 0 }, visited: { type: Array, default: () => [] } });
const resolved = computed(() => resolveSchema(props.spec, props.schema));
const fields = computed(() => Object.entries(resolved.value.properties ?? {}));
const seen = computed(() => props.schema?.$ref ? [...props.visited, props.schema.$ref] : props.visited);
const cyclic = computed(() => props.depth >= 8 || (props.schema?.$ref && props.visited.includes(props.schema.$ref)));
const rules = computed(() => {
  const schema = resolved.value;
  const zh = props.locale === 'zh';
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
  // 只解释能从原始条件直接读出的规则；所有条件仍保留完整 JSON 可核对。
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
});

// 约束由原始 schema 原样展示，保留 0、false 等有意义的值。
function constraints(schema) {
  const labels = props.locale === 'zh' ? { minimum: '最小值', maximum: '最大值', exclusiveMinimum: '大于', exclusiveMaximum: '小于', minLength: '最少字符', maxLength: '最多字符', minItems: '最少条数', maxItems: '最多条数', pattern: '匹配规则', format: '格式', default: '默认', const: '固定值' } : {};
  return Object.entries(schema).filter(([key]) => ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'pattern', 'format', 'default', 'const'].includes(key)).map(([key, value]) => `${labels[key] ?? key}: ${JSON.stringify(value)}`).join(' · ');
}
</script>
<template>
  <div class="schema-fields">
    <p v-if="cyclic" class="field-note">{{ locale === 'zh' ? '递归结构，完整定义见 OpenAPI JSON。' : 'Recursive structure. See the full OpenAPI JSON.' }}</p>
    <template v-else>
      <div v-if="rules.length" class="schema-rules"><strong>{{ locale === 'zh' ? '组合与模型限制' : 'Input and model rules' }}</strong><ul><li v-for="rule in rules" :key="rule">{{ rule }}</li></ul></div>
      <p v-if="!fields.length && !resolved.oneOf && !resolved.anyOf && !resolved.allOf" class="field-note">{{ resolved.type || 'object' }}<span v-if="resolved.format"> · {{ resolved.format }}</span><span v-if="resolved.description"> — {{ locale === 'zh' ? resolved['x-description-zh'] ?? resolved.description : resolved.description }}</span></p>
      <div v-if="!fields.length && resolved.enum" class="field-enum"><code v-for="value in resolved.enum" :key="String(value)">{{ JSON.stringify(value) }}</code></div>
      <p v-if="!fields.length && constraints(resolved)" class="field-constraints">{{ constraints(resolved) }}</p>
      <p v-if="!fields.length && resolved.required?.length" class="field-note">{{ locale === 'zh' ? '必需字段：' : 'Required fields: ' }}{{ resolved.required.join(', ') }}</p>
      <div v-for="[name, original] in fields" :key="name" class="schema-field">
        <div class="field-heading"><code>{{ name }}</code><span class="field-type">{{ resolveSchema(spec, original).type || (resolveSchema(spec, original).oneOf ? 'oneOf' : 'object') }}</span><span v-if="resolved.required?.includes(name)" class="field-required">{{ locale === 'zh' ? '必填' : 'required' }}</span></div>
        <p v-if="resolveSchema(spec, original).description || resolveSchema(spec, original)['x-description-zh']">{{ locale === 'zh' ? resolveSchema(spec, original)['x-description-zh'] ?? resolveSchema(spec, original).description : resolveSchema(spec, original).description }}</p>
        <div v-if="resolveSchema(spec, original).enum" class="field-enum"><code v-for="value in resolveSchema(spec, original).enum" :key="String(value)">{{ JSON.stringify(value) }}</code></div>
        <p v-if="constraints(resolveSchema(spec, original))" class="field-constraints">{{ constraints(resolveSchema(spec, original)) }}</p>
        <details v-if="resolveSchema(spec, original).properties || resolveSchema(spec, original).items || resolveSchema(spec, original).oneOf || resolveSchema(spec, original).anyOf || resolveSchema(spec, original).allOf"><summary>{{ locale === 'zh' ? '展开结构' : 'Show structure' }}</summary><SchemaFields :spec="spec" :schema="resolveSchema(spec, original).items || original" :locale="locale" :depth="depth + 1" :visited="seen" /></details>
      </div>
      <template v-for="composition in ['oneOf', 'anyOf', 'allOf']" :key="composition"><details v-for="(branch, index) in resolved[composition] || []" :key="index"><summary>{{ locale === 'zh' ? { oneOf: '任选一种结构', anyOf: '至少满足一种结构', allOf: '同时满足的规则' }[composition] : composition }} · {{ index + 1 }}</summary><SchemaFields :spec="spec" :schema="branch" :locale="locale" :depth="depth + 1" :visited="seen" /></details></template>
      <details v-if="['if', 'then', 'else', 'not', 'dependentRequired', 'dependentSchemas', 'patternProperties', 'unevaluatedProperties'].some(key => key in resolved)"><summary>{{ locale === 'zh' ? '条件约束（JSON Schema）' : 'Conditional constraints (JSON Schema)' }}</summary><pre class="schema-conditions"><code>{{ JSON.stringify(resolved, null, 2) }}</code></pre></details>
      <p v-if="resolved.additionalProperties === false" class="field-note">{{ locale === 'zh' ? '不接受未列出的字段。' : 'Additional properties are not allowed.' }}</p>
      <details v-if="typeof resolved.additionalProperties === 'object'"><summary>additionalProperties</summary><SchemaFields :spec="spec" :schema="resolved.additionalProperties" :locale="locale" :depth="depth + 1" :visited="seen" /></details>
    </template>
  </div>
</template>
