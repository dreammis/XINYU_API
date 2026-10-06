import { createHash } from 'node:crypto';
import path from 'node:path';

export const locales = ['zh', 'en'];
export const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

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
  if (!Array.isArray(declared) || new Set(declared).size !== declared.length) throw new Error(`${manifest.id}: duplicate/invalid models`);
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
    ids.add(source.id);
  }
}
