<script setup>
import { computed } from 'vue';
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue';
import { ControlWrapper, useVanillaControl } from '@jsonforms/vue-vanilla';
const props = defineProps(rendererProps());
const { control, controlWrapper, styles, appliedOptions, handleChange } = useVanillaControl(useJsonFormsControl(props));
const numeric = computed(() => ['number', 'integer'].includes(control.value.schema.type));
// 实时同步输入，Ctrl+Enter 也能发送当前内容；数字只转换类型，绝不截断小数或自动填默认值。
function change(event) {
  const value = event.target.value;
  handleChange(control.value.path, numeric.value ? (value === '' ? undefined : Number(value)) : value === '' && !control.value.required ? undefined : value);
}
</script>
<template>
  <ControlWrapper v-bind="controlWrapper" :styles="styles" :applied-options="appliedOptions">
    <textarea v-if="appliedOptions.multi" :id="`${control.id}-input`" :class="styles.control.textarea" :value="control.data" :disabled="!control.enabled" @input="change" />
    <input v-else :id="`${control.id}-input`" :class="styles.control.input" :type="numeric ? 'number' : 'text'" :step="numeric ? 'any' : undefined" :value="control.data" :disabled="!control.enabled" @input="change" />
  </ControlWrapper>
</template>
