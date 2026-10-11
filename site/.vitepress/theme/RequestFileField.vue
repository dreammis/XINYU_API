<script setup>
import { computed, ref } from 'vue';
import { toDataPathSegments } from '@jsonforms/core';
import { rendererProps, useJsonForms, useJsonFormsControl } from '@jsonforms/vue';
import { ControlWrapper, useVanillaControl } from '@jsonforms/vue-vanilla';
const props = defineProps(rendererProps());
const { control, controlWrapper, styles, appliedOptions, handleChange } = useVanillaControl(useJsonFormsControl(props));
const jsonforms = useJsonForms();
const input = ref(null);
const fieldName = computed(() => toDataPathSegments(props.uischema.scope).at(-1));
const selected = computed(() => jsonforms.core.data.body?.[fieldName.value]);
// 文件不是路径字符串：保留浏览器 File 对象，支持契约中的 image[] 多文件字段。
function selectFiles(event) {
  const files = [...event.target.files];
  // image[] 是协议中的字面字段名；组件默认的点路径会把方括号当作数组路径，必须整体更新 body。
  const body = { ...jsonforms.core.data.body, [fieldName.value]: files.length ? (appliedOptions.value.apiFileArray ? files : files[0]) : undefined };
  handleChange('body', body);
}
function removeFiles() {
  const body = { ...jsonforms.core.data.body };
  delete body[fieldName.value];
  handleChange('body', body);
  input.value.value = '';
}
</script>
<template>
  <ControlWrapper v-bind="controlWrapper" :styles="styles" :applied-options="appliedOptions">
    <input ref="input" :id="`${control.id}-input`" type="file" :multiple="appliedOptions.apiFileArray" :disabled="!control.enabled" @change="selectFiles" />
    <button v-if="selected" type="button" class="request-file-clear" @click="removeFiles">{{ control.config.locale === 'zh' ? '移除文件' : 'Remove file' }}</button>
  </ControlWrapper>
</template>
