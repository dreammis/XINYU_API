import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { locales, publicPath, sha256, validateBundle, validateRegistry } from './docs-contract.mjs';

const root = path.resolve(process.env.DOCS_ROOT ?? fileURLToPath(new URL('..', import.meta.url)));
const remote = process.argv.includes('--remote');
const registry = JSON.parse(await readFile(path.join(root, 'sources.json'), 'utf8'));
validateRegistry(registry);
const prepared = [];
const revisions = new Map();

// 先读取并校验全部来源；任何工程缺文件时中止，不能把旧快照当成更新成功。
for (const source of registry.sources) {
  const directory = path.resolve(root, source.localDirectory);
  let revision;
  if (remote) {
    const release = `${source.repository}@${source.ref}`;
    if (!revisions.has(release)) {
      const response = await fetch(`https://api.github.com/repos/${source.repository}/commits/${encodeURIComponent(source.ref)}`, { headers: githubHeaders() });
      if (!response.ok) throw new Error(`${source.id}: cannot resolve release ref (${response.status})`);
      revisions.set(release, (await response.json()).sha);
    }
    revision = revisions.get(release);
  } else {
    revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim();
  }
  async function sourceFile(filename) {
    publicPath(filename);
    if (!remote) return readFile(path.join(directory, filename), 'utf8');
    const url = `https://api.github.com/repos/${source.repository}/contents/${filename.split('/').map(encodeURIComponent).join('/')}?ref=${revision}`;
    const response = await fetch(url, { headers: githubHeaders('application/vnd.github.raw+json') });
    if (!response.ok) throw new Error(`${source.id}: ${filename} unavailable (${response.status})`);
    return response.text();
  }
  const manifestText = await sourceFile(source.manifest);
  const manifest = JSON.parse(manifestText);
  if (manifest.id !== source.id) throw new Error(`${source.id}: manifest ID differs`);
  const specText = await sourceFile(manifest.openapi);
  const spec = JSON.parse(specText);
  const guides = {};
  for (const locale of locales) guides[locale] = (await sourceFile(manifest.guides[locale])).replaceAll('\r\n', '\n');
  validateBundle(manifest, spec, guides);
  const files = { 'public-docs.json': JSON.stringify(manifest, null, 2) + '\n', 'openapi.json': JSON.stringify(spec, null, 2) + '\n' };
  for (const locale of locales) files[`guide.${locale}.md`] = guides[locale];
  const selectedFiles = [source.manifest, manifest.openapi, ...Object.values(manifest.guides)];
  const localChanges = remote ? [] : execFileSync('git', ['status', '--porcelain', '--', ...selectedFiles], { cwd: directory, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  files['provenance.json'] = JSON.stringify({ repository: source.repository, revision, ref: source.ref, workingTreeChanges: localChanges, hashes: Object.fromEntries(Object.entries(files).map(([name, content]) => [name, sha256(content)])) }, null, 2) + '\n';
  prepared.push({ id: source.id, files });
}
for (const bundle of prepared) {
  const destination = path.join(root, 'catalog', bundle.id);
  await mkdir(destination, { recursive: true });
  for (const [name, content] of Object.entries(bundle.files)) await writeFile(path.join(destination, name), content);
  console.log(`Imported ${bundle.id} (${remote ? 'released commit' : 'local working tree'})`);
}

// 私有工程只读取 DOCS_SOURCE_TOKEN；密钥不进入文件、URL 或日志。
function githubHeaders(accept = 'application/vnd.github+json') {
  return { Accept: accept, 'X-GitHub-Api-Version': '2022-11-28', ...(process.env.DOCS_SOURCE_TOKEN ? { Authorization: `Bearer ${process.env.DOCS_SOURCE_TOKEN}` } : {}) };
}
