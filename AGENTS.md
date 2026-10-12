# New API 接入与文档维护约定

本仓库是 C：接入与文档中心 `G:/workspace/xyapi_doc`。A 是实现功能的源工程，B 是正在运行的 New API 服务。A 的 AI 先读 `START_HERE.md`，可直接在 C 完成接入代码、客户契约与文档交付。客户文档由 Cloudflare Pages 托管。

- 当前唯一站点技术栈是 VitePress + Vue，调试使用 JSON Forms + AJV，部署使用 Cloudflare Pages / Pages Functions。Next.js、React、Fumadocs、Scalar 旧站已清理，不恢复旧站命令或按废弃迁移方案开发。

- 共用指南在 `content/zh`、`content/en`，来源在 `sources.json`。
- 给 A 的完整接入规范在 `docs/integration/README.md`，包含研究路径、方式选择、渠道配置、必要业务决定和交付契约。C 从 `projects/README.md` 和各源工程 README 找资料，不依赖聊天记忆。
- 每个源工程的 `source.json`、`upstream/api.md`、`research/newapi-integration.md`、`newapi/<能力ID>/channel.md` 和 `releases` 是内部资料，不列入公开清单；管理共用环境与官方参考保留 `newapi/`。
- 接入插件、适配器测试与客户契约集中维护在 `projects/<源工程ID>/newapi/<能力ID>/`。图片/视频的唯一维护入口已迁入 C，A 内的旧副本不再作为文档来源；业务实现仍在 A。
- `catalog` 是带源码版本和内容哈希的导入快照，`gitbook` 是可移植 Markdown 导出，`site/zh`、`site/en` 是自动生成的站点输入。修改接口参数、模型名、限制或响应时回到登记的公开契约，不直接改生成结果。
- 新能力按 `templates/public-docs.json` 提供中英文指南与 OpenAPI 3.1，登记一次来源即可生成导航和参考页。非模型能力允许 `models: []`。
- 分类和模型展示按 `docs/maintenance/model-catalog-contract.md`；选型章节从源指南引用，不能手抄另一份限制表。源清单的 `category`、`modelDetails` 与真实客户协议一致。
- 公开契约描述客户通过 New API 实际调用的入口，必须核对适配器；内部 API 的请求响应不能直接作为客户规范。
- 构建使用已导入快照；源工程文件缺失、哈希错误或链接错误必须明确失败。只导入清单列出的公开文件。
- 契约修改后先运行真实适配器的示例校验，再执行 `npm run docs:sync` 导入。修改后运行 `npm run build`、`npm run docs:check` 和 `npm test`；自动测试不发起付费生成或管理写操作。
- New API 环境说明与管理入口在 `newapi/README.md`、`newapi/environment.json`。管理员凭证只存 `.local/newapi/` 的 Windows DPAPI 密文，通过 `newapi/load-session.ps1` 加载；不得输出密钥或写入版本库、公开文件、Pages 环境和客户调试配置。
- 多个 A 的 AI 同时修改 C 时，各自负责独立能力目录；共享来源登记、价格和渠道配置先读取当前值、合并本次条目，禁止整份覆盖。动共享代码或同一插件前核对正在进行的工作。
- 网站及自动部署状态见 `docs/maintenance/cloudflare-setup.md`。GitBook 历史导入状态保留在 `gitbook-setup.md`。
- 新能力交付按 `docs/maintenance/api-release-sop.md` 执行。角色任务说明与交接记录在 `templates/`；客户入口验收后才发布公开契约和通知，普通源码 push 不代表上线。
- API 调试使用本站 `/api-proxy`，允许的目的地和操作从公开规范生成。不添加管理员 Key，不将客户 Key 发送给第三方调试服务。
- 发布仅包含本任务接入和文档文件；其他前端历史和未提交工作需要保留。迁入代码不代表已重新部署服务，本地预览不代表网站已发布。

详细工作流见 `docs/maintenance/public-docs-workflow.md`。
