<script setup>
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue';
import { ControlWrapper, useVanillaControl } from '@jsonforms/vue-vanilla';
const props = defineProps(rendererProps());
const { control, controlWrapper, styles, appliedOptions, handleChange } = useVanillaControl(useJsonFormsControl(props));
// 三态输入区分“不传”和 false；原生 checkbox 无法表达省略，可能误导默认 true 的参数。
function change(event) {
  handleChange(control.value.path, event.target.value === '' ? undefined : event.target.value === 'true');
}
</script>
<template>
  <ControlWrapper v-bind="controlWrapper" :styles="styles" :applied-options="appliedOptions">
    <select :id="`${control.id}-input`" :class="styles.control.select" :value="control.data === undefined ? '' : String(control.data)" :disabled="!control.enabled" @change="change">
      <option value="">{{ control.config.locale === 'zh' ? '不传 · 使用接口默认行为' : 'Omit · use API default' }}</option>
      <option value="true">true</option><option value="false">false</option>
    </select>
  </ControlWrapper>
</template>
