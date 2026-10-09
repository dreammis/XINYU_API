import { createHash } from 'node:crypto';
import path from 'node:path';

export const locales = ['zh', 'en'];
export const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
export const categories = ['image', 'video', 'tts', 'music', 'text', 'transcription', 'tool', 'other'];

// 只接受显式登记的相对文件，不能让来源清单读到工程以外的文件。
export function publicPath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes(':') || path.posix.isAbsolute(value) || value.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Invalid public document path: ${value}`);
  }
  return value;
}

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

// 同名能力会覆盖目录，缺失规范或悬空引用则会误导客户；必须在写入前失败。
export function validateBundle(manifest, spec, guides) {
  if (manifest.schemaVersion !== 1 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.id)) throw new Error('Invalid public-docs manifest');
  if (!manifest.version || spec.info?.version !== manifest.version) throw new Error(`${manifest.id}: contract version mismatch`);
  if (!spec.openapi?.startsWith('3.1.') || !Object.keys(spec.paths ?? {}).length || !spec.servers?.length || !spec.components?.securitySchemes || !spec.security?.length) throw new Error(`${manifest.id}: incomplete OpenAPI contract`);
  for (const locale of locales) {
    if (!manifest.title?.[locale] || !manifest.guides?.[locale] || !guides[locale]?.startsWith('# ')) throw new Error(`${manifest.id}: missing ${locale} guide/title`);
    publicPath(manifest.guides[locale]);
  }
  publicPath(manifest.openapi);
  const operationIds = new Set();
  for (const [endpoint, item] of Object.entries(spec.paths)) {
    if (!endpoint.startsWith('/')) throw new Error(`Invalid endpoint: ${endpoint}`);
    for (const method of methods) {
      const operation = item[method];
      if (!operation) continue;
      if (!operation.operationId || operationIds.has(operation.operationId) || !Object.keys(operation.responses ?? {}).length) throw new Error(`${manifest.id}: invalid/duplicate operation ${method} ${endpoint}`);
      operationIds.add(operation.operationId);
    }
  }
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.$ref) {
      if (!value.$ref.startsWith('#/')) throw new Error(`${manifest.id}: external references must be bundled before export`);
      const target = value.$ref.slice(2).split('/').reduce((current, segment) => current?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')], spec);
      if (!target) throw new Error(`${manifest.id}: unresolved reference ${value.$ref}`);
    }
    Object.values(value).forEach(visit);
  }
  visit(spec);
  const declared = manifest.models ?? [];
  if (!Array.isArray(declared) || declared.some(model => typeof model !== 'string' || !model || /[\u0000-\u001f]/.test(model)) || new Set(declared).size !== declared.length) throw new Error(`${manifest.id}: duplicate/invalid models`);
  if (manifest.category !== undefined && !categories.includes(manifest.category)) throw new Error(`${manifest.id}: invalid category`);
  // 展示信息只能引用已经登记的客户模型和操作，不能凭空增加可调用能力。
  for (const [model, detail] of Object.entries(manifest.modelDetails ?? {})) {
    if (!declared.includes(model) || !detail || typeof detail !== 'object') throw new Error(`${manifest.id}: unknown model detail ${model}`);
    if (detail.group !== undefined && (typeof detail.group !== 'string' || !detail.group)) throw new Error(`${manifest.id}: invalid model group`);
    for (const field of ['title', 'summary']) {
      if (detail[field] && locales.some((locale) => typeof detail[field][locale] !== 'string' || !detail[field][locale])) throw new Error(`${manifest.id}: incomplete model ${field}`);
    }
    if (detail.operations && (!Array.isArray(detail.operations) || !detail.operations.length || detail.operations.some((id) => !operationIds.has(id)))) throw new Error(`${manifest.id}: unknown model operation`);
  }
  for (const schema of Object.values(spec.components.schemas ?? {})) {
    const models = schema.properties?.model?.enum;
    if (models && JSON.stringify([...models].sort()) !== JSON.stringify([...declared].sort())) throw new Error(`${manifest.id}: model catalog disagrees with request schema`);
  }
}

export function validateRegistry(registry) {
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.sources) || !registry.sources.length) throw new Error('Invalid sources.json');
  if (new URL(registry.specBaseUrl).protocol !== 'https:') throw new Error('OpenAPI source must be HTTPS');
  const ids = new Set();
  for (const source of registry.sources) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.id) || ids.has(source.id)) throw new Error(`Duplicate/invalid source: ${source.id}`);
    if (!/^[\w.-]+\/[\w.-]+$/.test(source.repository) || !source.ref || !source.localDirectory) throw new Error(`Incomplete source: ${source.id}`);
    publicPath(source.manifest);
    if (source.category !== undefined && !categories.includes(source.category)) throw new Error(`Invalid source category: ${source.id}`);
    // 产品分组只能由明确登记提供，不能按名称猜测；一个调用名只能归属一组。
    if (source.modelGroups !== undefined) {
      if (!Array.isArray(source.modelGroups) || !source.modelGroups.length) throw new Error(`Invalid model groups: ${source.id}`);
      const groupIds = new Set();
      const groupedModels = new Set();
      for (const group of source.modelGroups) {
        if (!group || typeof group.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(group.id) || groupIds.has(group.id) || locales.some(locale => typeof group.title?.[locale] !== 'string' || !group.title[locale]) || !Array.isArray(group.models) || !group.models.length) throw new Error(`Invalid model group: ${source.id}`);
        groupIds.add(group.id);
        for (const model of group.models) {
          if (typeof model !== 'string' || !model || groupedModels.has(model)) throw new Error(`Duplicate/invalid grouped model: ${source.id}/${model}`);
          groupedModels.add(model);
        }
      }
    }
    if (source.selectionSections && locales.some((locale) => !Array.isArray(source.selectionSections[locale]) || source.selectionSections[locale].some((heading) => typeof heading !== 'string' || !heading))) throw new Error(`Invalid selection sections: ${source.id}`);
    if (source.modelNotes && (!Array.isArray(source.modelNotes) || source.modelNotes.some(note => !Array.isArray(note.models) || !note.models.length || note.models.some(model => typeof model !== 'string' || !model) || locales.some(locale => typeof note.contains?.[locale] !== 'string' || !note.contains[locale])))) throw new Error(`Invalid model note pointers: ${source.id}`);
    ids.add(source.id);
  }
}

// 文档产品分组必须覆盖当前公开契约；源工程交付组名后不能与登记互相冲突。
export function validateModelGroups(manifest, source) {
  if (!source.modelGroups) return;
  if (JSON.stringify(source.modelGroups.flatMap(group => group.models).sort()) !== JSON.stringify([...(manifest.models ?? [])].sort())) throw new Error(`${source.id}: model groups must cover exactly the public model catalog`);
  for (const group of source.modelGroups) {
    for (const model of group.models) {
      const sourceGroup = manifest.modelDetails?.[model]?.group;
      if (sourceGroup && group.id !== sourceGroup) throw new Error(`${source.id}: model group disagrees with public manifest (${model})`);
    }
  }
}
