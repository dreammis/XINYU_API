# XY API 文档站

客户文档由 **Cloudflare Pages** 托管，使用 VitePress + Scalar，提供中英文指南、全文搜索、明暗主题和 API 在线调试。页面布局参考 <https://docs.stackai.com/workflow-builder/inputs>。

Pages 地址：<https://xyapi-docs.pages.dev/zh/>。自定义域名目标：<https://doc.2yanx.dpdns.org/>。当前部署和域名验证状态见 [cloudflare-setup.md](docs/maintenance/cloudflare-setup.md)。

## 维护流程

源工程功能 → New API 客户接入 → 公开指南 + OpenAPI + public-docs.json → 本仓库导入、校验与生成 → Cloudflare Pages 自动部署 → 客户文档站。

公开契约描述客户实际调用的入口，在源工程接入目录维护一份。插件、内置渠道和非模型计费功能都能登记。一个工程可以登记多个能力，相同客户协议的多个渠道无需重复文档。

新工程第一次登记 [sources.json](sources.json)，配置一次发布通知。以后只修改并发布源工程公开契约，不用在这里再填接口参数。详见 [多工程发布流程](docs/maintenance/public-docs-workflow.md)。源工程的远端发布文件及跨仓库 Secrets 需完成首次接线；文档仓库 master 到 Pages 已关联自动部署。

## 本地命令

需要 Node.js 22。首次 npm ci，随后依次运行 npm run docs:generate、npm run docs:check、npm test、npm run build。开发预览用 npm run dev，构建预览用 npm run preview。

从本机源工程更新用 npm run docs:sync；从 GitHub 已发布 ref 更新用 npm run docs:sync:remote。私有源工程使用 DOCS_SOURCE_TOKEN。导入后运行生成、校验和构建。

| 位置 | 内容 |
| --- | --- |
| content/zh、content/en | 共用指南 |
| sources.json | 源工程公开清单和发布 ref |
| catalog/ | 只读快照，保留源码 SHA 与哈希 |
| gitbook/ | 可移植 Markdown/OpenAPI 导出 |
| site/.vitepress/ | 文档站配置、主题与 Scalar 调试组件 |
| site/zh、site/en | 构建时自动生成的页面，不手改 |
| functions/ | 调试转发及自动生成的公开接口允许列表 |
| scripts/、tests/ | 导入、生成、校验与测试 |
| templates/ | 新能力公开清单和通知工作流 |

当前覆盖图片生成/编辑/SSE，视频创建/状态/下载/HEAD，视频 Responses stream/后台创建/查询，共 8 个接口。原有 ElevenLabs TTS 指南保留，其 New API 客户响应仍需核对。图片和视频参数取自实际适配器契约。

在线调试通过本站转发客户自己的 API Key，不保存服务器管理员 Key，也不使用第三方调试代理；生成请求会按账户正常计费。

此前 GitBook 导入记录保留在 [gitbook-setup.md](docs/maintenance/gitbook-setup.md)。旧站命令保留为 dev:legacy、build:legacy、start:legacy；本机未推送的 Next.js/Fumadocs 工作保留，未并入发布仓库。
