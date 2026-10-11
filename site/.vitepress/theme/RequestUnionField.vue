<script setup>
import { computed, ref, watch } from 'vue';
import { rendererProps, useJsonFormsOneOfControl } from '@jsonforms/vue';
import { ControlWrapper, useVanillaControl } from '@jsonforms/vue-vanilla';
const props = defineProps(rendererProps());
const { control, controlWrapper, styles, appliedOptions, handleChange } = useVanillaControl(useJsonFormsOneOfControl(props));
const selected = ref(control.value.indexOfFittingSchema >= 0 ? String(control.value.indexOfFittingSchema) : '');
const branch = computed(() => control.value.schema.oneOf[Number(selected.value)]);
const numeric = computed(() => selected.value !== '' && ['number', 'integer'].includes(branch.value?.type));
const zh = computed(() => appliedOptions.value.locale === 'zh');
// JSON 编辑或其他控件更新同一值时跟随真实类型；仅选择类型不会自动生成请求值。
watch(() => control.value.data, value => {
  if (value === undefined) return;
  const index = control.value.indexOfFittingSchema >= 0 ? control.value.indexOfFittingSchema : control.value.schema.oneOf.findIndex(item => item.type === typeof value || (item.type === 'integer' && typeof value === 'number'));
  if (index >= 0) selected.value = String(index);
});
function select(event) {
  selected.value = event.target.value;
  handleChange(control.value.path, undefined);
}
function change(event) {
  const value = event.target.value;
  handleChange(control.value.path, numeric.value ? (value === '' ? undefined : Number(value)) : value === '' && !control.value.required ? undefined : value);
}
</script>
<template>
  <ControlWrapper v-bind="controlWrapper" :styles="styles" :applied-options="appliedOptions">
    <select :id="`${control.id}-type`" :class="styles.control.select" :value="selected" :disabled="!control.enabled" :aria-label="`${control.label} · ${zh ? '值类型' : 'Value type'}`" @change="select">
      <option value="">{{ zh ? (control.required ? '请选择值类型' : '不传此参数') : (control.required ? 'Choose a value type' : 'Omit this parameter') }}</option>
      <option v-for="(item, index) in control.schema.oneOf" :key="index" :value="String(index)">{{ item.title }}</option>
    </select>
    <input v-if="selected !== ''" :id="`${control.id}-input`" :class="styles.control.input" :type="numeric ? 'number' : 'text'" :step="numeric ? 'any' : undefined" :value="control.data" :disabled="!control.enabled" @input="change" />
    <p class="request-union-note">{{ zh ? '切换值类型会清空当前字段；填写后才加入请求。' : 'Changing the value type clears this field. It is sent only after you enter a value.' }}</p>
  </ControlWrapper>
</template>
