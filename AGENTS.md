# 文档维护约定

客户文档由 Cloudflare Pages 托管，本仓库负责多工程的公开接口汇总。

- 共用指南在 `content/zh`、`content/en`，来源在 `sources.json`。
- `catalog` 是带源码版本和内容哈希的导入快照，`gitbook` 是可移植 Markdown 导出，`site/zh`、`site/en` 是自动生成的站点输入。修改接口参数、模型名、限制或响应时回到源工程公开契约，不直接改生成结果。
- 新能力按 `templates/public-docs.json` 提供中英文指南与 OpenAPI 3.1，登记一次来源即可生成导航和参考页。非模型能力允许 `models: []`。
- 分类和模型展示按 `docs/maintenance/model-catalog-contract.md`；选型章节从源指南引用，不能手抄另一份限制表。源清单的 `category`、`modelDetails` 与真实客户协议一致。
- 公开契约描述客户通过 New API 实际调用的入口，必须核对适配器；内部 API 的请求响应不能直接作为客户规范。
- 构建使用已导入快照；源工程文件缺失、哈希错误或链接错误必须明确失败。只导入清单列出的公开文件。
- 修改后运行 `npm run build`、`npm run docs:check` 和 `npm test`。源工程契约修改后先在源工程运行真实适配器的示例校验，再导入。
- 网站及自动部署状态见 `docs/maintenance/cloudflare-setup.md`。GitBook 历史导入状态保留在 `gitbook-setup.md`。
- 新能力交付按 `docs/maintenance/api-release-sop.md` 执行。角色任务说明与交接记录在 `templates/`；客户入口验收后才发布公开契约和通知，普通源码 push 不代表上线。
- API 调试使用本站 `/api-proxy`，允许的目的地和操作从公开规范生成。不添加管理员 Key，不将客户 Key 发送给第三方调试服务。
- 发布仅包含本任务文档文件；其他前端历史和未提交工作需要保留。

详细工作流见 `docs/maintenance/public-docs-workflow.md`。
