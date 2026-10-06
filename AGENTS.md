# 文档维护约定

客户文档由 GitBook 托管，本仓库负责多工程的公开接口汇总。

- 共用指南在 `content/zh`、`content/en`，来源在 `sources.json`。
- `catalog` 是带源码版本和内容哈希的导入快照，`gitbook` 是生成结果。修改接口参数、模型名、限制或响应时回到源工程公开契约，不直接改这两个目录。
- 新能力按 `templates/public-docs.json` 提供中英文指南与 OpenAPI 3.1，登记一次来源即可生成导航和参考页。非模型能力允许 `models: []`。
- 公开契约描述客户通过 New API 实际调用的入口，必须核对适配器；内部 API 的请求响应不能直接作为客户规范。
- 构建使用已导入快照；源工程文件缺失、哈希错误或链接错误必须明确失败。只导入清单列出的公开文件。
- 修改后运行 `npm run build`、`npm run docs:check` 和 `npm test`。源工程契约修改后先在源工程运行真实适配器的示例校验，再导入。
- 网站及自动同步状态见 `docs/maintenance/gitbook-setup.md`。单次 API 导入不能记录成原生自动 Git Sync 已配置。
- 发布仅包含本任务文档文件；其他前端历史和未提交工作需要保留。

详细工作流见 `docs/maintenance/public-docs-workflow.md`。
