# XY API GitBook 文档

客户文档由 **GitBook 托管**。本仓库维护通用指南、导入各工程公开接口契约并生成 GitBook 页面。参考站为 <https://docs.stackai.com/workflow-builder/inputs>；侧栏、搜索、主题与移动端布局由 GitBook 提供。

中文入口：[`gitbook/zh/README.md`](gitbook/zh/README.md)。英文入口：[`gitbook/en/README.md`](gitbook/en/README.md)。导航：各语言的 `SUMMARY.md`。

## 维护流程

```text
源工程业务功能
  → New API 客户接入（内置渠道 / 插件 / 独立入口）
  → 客户指南 + public-openapi.json + public-docs.json
  → 本仓库导入、校验、生成 gitbook/
  → GitBook Git Sync
  → 客户文档站
```

客户接口契约在对外适配层维护一份，内部 API 文档不能直接发布。一个工程可以登记多个能力；多个渠道若提供相同客户契约，也不必重复创建文档。非模型功能的 `models` 可以为空。

新工程第一次登记 [`sources.json`](sources.json)。后续发布时更新源工程契约，通知文档仓库自动导入，**不用在这里再次填写参数文档**。详见 [`docs/maintenance/public-docs-workflow.md`](docs/maintenance/public-docs-workflow.md)。

## 本地命令

需要 Node.js 22。

```powershell
npm ci
npm run build
npm run docs:check
npm test
```

从本机源工程更新：`npm run docs:sync`。从已发布的 GitHub 工程更新：`npm run docs:sync:remote`。导入后再 build/check。私有源工程读取用环境变量 `DOCS_SOURCE_TOKEN`。

默认构建只依赖已导入快照，不需要其他工程和网络；缺失或损坏的快照明确报错。远程导入先把 ref 解析成固定 SHA，再读取同一提交的公开文件。

| 位置 | 维护方式 |
| --- | --- |
| `content/zh`、`content/en` | 手写共用指南 |
| `content/navigation.json` | 共用指南目录 |
| `sources.json` | 源工程、公开清单与发布 ref |
| `catalog/<能力>/` | 只读导入快照，记录源码 SHA 和哈希 |
| `gitbook/` | 自动生成，交给 GitBook 同步；不要手改 |
| `gitbook-docs.yaml` | 网站与中英文目录映射 |
| `scripts/`、`tests/` | 导入、构建、校验与回归测试 |
| `templates/` | 新工程的清单和更新通知模板 |

当前文档覆盖图片生成/编辑/SSE、视频任务创建/查询/下载/HEAD、视频 Responses stream/后台创建/查询。公开视频模型为 `cogvideo-*`，视频状态查询不返回内部 `data[0].url`，文件从 `/content` 下载。

## 首次托管

见 [`docs/maintenance/gitbook-setup.md`](docs/maintenance/gitbook-setup.md)。GitBook XY API 网站已创建；原生 Git Sync 目标为 `dreammis/XINYU_API` 的 `master` 分支，中英文空间分别使用 Project directory `gitbook/zh`、`gitbook/en`。当前账户绑定与自动同步状态以该设置文档的发布记录为准。

远端已有的 VitePress 文件保留用于查看旧文档；旧站命令为 `dev:legacy`、`build:legacy`、`start:legacy`。本机尚未推送的 Next.js/Fumadocs 工作没有并入此次发布。
