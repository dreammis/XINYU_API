<script setup>
import { computed } from 'vue';
import { resolveSchema } from './openapi-content.mjs';
const props = defineProps({ spec: Object, schema: Object, locale: String, depth: { type: Number, default: 0 }, visited: { type: Array, default: () => [] } });
const resolved = computed(() => resolveSchema(props.spec, props.schema));
const fields = computed(() => Object.entries(resolved.value.properties ?? {}));
const seen = computed(() => props.schema?.$ref ? [...props.visited, props.schema.$ref] : props.visited);
const cyclic = computed(() => props.depth >= 8 || (props.schema?.$ref && props.visited.includes(props.schema.$ref)));

// 约束由原始 schema 原样展示，保留 0、false 等有意义的值。
function constraints(schema) {
  return Object.entries(schema).filter(([key]) => ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'pattern', 'format', 'default', 'const'].includes(key)).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(' · ');
}
</script>
<template>
  <div class="schema-fields">
    <p v-if="cyclic" class="field-note">{{ locale === 'zh' ? '递归结构，完整定义见 OpenAPI JSON。' : 'Recursive structure. See the full OpenAPI JSON.' }}</p>
    <template v-else>
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
      <template v-for="composition in ['oneOf', 'anyOf', 'allOf']" :key="composition"><details v-for="(branch, index) in resolved[composition] || []" :key="index"><summary>{{ composition }} · {{ index + 1 }}</summary><SchemaFields :spec="spec" :schema="branch" :locale="locale" :depth="depth + 1" :visited="seen" /></details></template>
      <details v-if="['if', 'then', 'else', 'not', 'dependentRequired', 'dependentSchemas', 'patternProperties', 'unevaluatedProperties'].some(key => key in resolved)"><summary>{{ locale === 'zh' ? '条件约束（JSON Schema）' : 'Conditional constraints (JSON Schema)' }}</summary><pre class="schema-conditions"><code>{{ JSON.stringify(resolved, null, 2) }}</code></pre></details>
      <p v-if="resolved.additionalProperties === false" class="field-note">{{ locale === 'zh' ? '不接受未列出的字段。' : 'Additional properties are not allowed.' }}</p>
      <details v-if="typeof resolved.additionalProperties === 'object'"><summary>additionalProperties</summary><SchemaFields :spec="spec" :schema="resolved.additionalProperties" :locale="locale" :depth="depth + 1" :visited="seen" /></details>
    </template>
  </div>
</template>
