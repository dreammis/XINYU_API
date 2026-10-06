import SwaggerParser from '@apidevtools/swagger-parser';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const registry = JSON.parse(await readFile(path.join(root, 'sources.json'), 'utf8'));
// 使用标准 OpenAPI 校验器，验证手写结构检查无法发现的规范错误。
for (const source of registry.sources) {
  await SwaggerParser.validate(path.join(root, 'gitbook/openapi', `${source.id}.json`));
  console.log(`OpenAPI valid: ${source.id}`);
}
