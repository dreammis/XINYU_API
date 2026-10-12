# XY API 接入与文档中心

本仓库是 **C：接入与文档中心 G:/workspace/xyapi_doc**。**A** 是实现业务的源工程，**B** 是正在运行的 New API 服务。A 的 AI 读 C 的 [START_HERE.md](START_HERE.md)，在 A 开发业务，在 C 完成接入代码、客户契约、验收记录与文档发布。B 不要求另外建一个工程或 AI 任务。

客户文档由 Cloudflare Pages 托管，使用 VitePress + Vue + JSON Forms，提供中英文指南、全文搜索、明暗主题和 API 在线调试，页面参考 <https://docs.stackai.com/workflow-builder/inputs>。

站点：<https://xyapi-docs.pages.dev/zh/>。自定义域名目标：<https://doc.2yanx.dpdns.org/>。部署和域名实际核对记录见 [cloudflare-setup.md](docs/maintenance/cloudflare-setup.md)。

## 从 A 调通到交付

把 [A 的任务说明](templates/ai-upstream-task.md) 发给 A 的 AI，即要求它读 C 规范并完成接入与文档。详细步骤见 [执行 SOP](docs/maintenance/api-release-sop.md)。

A 业务 API → 在 C 编写接入与测试 → 部署到 B 并验收客户调用/计费 → 在 C 完成公开契约 → 导入生成并发布文档。客户请求走客户 → B → A → B → 客户。

给 A 阅读的完整规范在 [docs/integration/README.md](docs/integration/README.md)，包括如何研究当前 New API、选择接入方式、配置渠道/计费、确认业务决定和交付资料。C 从 [projects/README.md](projects/README.md) 找各源工程文档。

每个源工程在 projects/<源工程ID>/ 有自己的上游资料、研究、接入代码、客户规范和验收记录。本次实际项目是 [vidu2api](projects/vidu2api/README.md)，图片与视频插件/契约已移入它的 newapi/ 子目录。sources.json 指向 C 自身，A 的旧公开文件不再导入。配套服务的位置和运行边界见该项目说明；共用环境与凭证见 [newapi/README.md](newapi/README.md)。

一个能力维护一份客户协议。多个工程或渠道提供相同协议时复用；非模型计费功能也可登记，models 允许为空。分类、分组和选型章节按 [模型展示约定](docs/maintenance/model-catalog-contract.md)。

## 本地验证

需要 Node.js 22；首次安装 npm ci。在 C 修改公开文件后执行：

```powershell
npm test
npm run docs:sync
npm run build
npm run docs:check
```

npm test 包括文档流水线、客户调试代理、现有图片/视频插件和公开请求示例测试，不执行管理写操作或付费生成。开发预览用 npm run dev，构建预览用 npm run preview。

docs:sync 导入登记的本机公开文件；build 使用已导入快照。docs:sync:remote 是读取远端已发布契约的工具，外部私有来源使用 DOCS_SOURCE_TOKEN。集中到 C 的能力无需每个 A 配置跨仓库通知。

## 维护位置

| 位置 | 内容 |
| --- | --- |
| START_HERE.md | A 的 AI 快速入口，角色与完整交付要求 |
| docs/integration/ | 给 A 的规范：研究、接入方式、渠道、业务决定与交付 |
| projects/README.md | 给 C 的源工程索引 |
| projects/<源工程ID>/ | 项目身份、upstream、research、newapi/<能力ID> 接入/测试/客户文件、releases 验收记录 |
| newapi/reference/<版本>/ | 固定提交的官方插件文档、类型/schema与来源哈希 |
| newapi/environment.json、load-session.ps1、inspect.ps1 | 非敏感配置、本机加载凭证、只读检查 |
| .local/newapi/ | Windows DPAPI 密文凭证与原始证据，Git 忽略 |
| content/zh、content/en | 共用指南 |
| sources.json | 公开清单与发布 ref 登记、模型展示指针 |
| catalog/ | 导入快照，记录来源 SHA、未提交状态与哈希 |
| gitbook/ | 可移植 Markdown/OpenAPI 导出 |
| site/.vitepress/ | 站点配置、主题、JSON Forms 表单与本站调试面板 |
| site/zh、site/en | 构建生成页面，不手改 |
| functions/ | 客户调试转发与文档发现接口 |
| site/public-endpoints.mjs | 从公开规范生成的调试允许列表 |
| scripts/、tests/ | 导入、生成、校验与测试 |
| templates/ | 任务说明、交付记录、公开清单、外部来源通知模板 |

现有公开契约覆盖图片生成/编辑/SSE、视频创建/状态/下载/HEAD、视频 Responses stream/后台创建/查询，以及 Vox 1 语音创建/查询/产物列表/下载/HEAD，共 13 个 HTTP 操作。TTS 提供音色试听；参数与限制来自已导入的客户契约。

在线调试通过本站转发客户自己的 Key，不保存管理员 Key，不使用第三方调试代理；生成按客户账户正常计费。管理员凭证仅用于在本机管理 B，不会进入 Cloudflare 站点。

当前只维护 VitePress + Vue 站点，API 调试使用 JSON Forms + AJV，部署到 Cloudflare Pages。Next.js、React、Fumadocs 和 Scalar 的旧站代码、依赖与迁移方案已清理，不再提供旧站启动命令。

`gitbook/` 是当前生成器使用的 Markdown/OpenAPI 导出和构建中间产物，不是另一套运行中的网站；保留它用于内容校验与平台迁移。GitBook 历史导入见 [gitbook-setup.md](docs/maintenance/gitbook-setup.md)。普通更新修改 Markdown、公开 OpenAPI 和来源登记，特殊交互才修改 `site/.vitepress/theme/` 组件。
