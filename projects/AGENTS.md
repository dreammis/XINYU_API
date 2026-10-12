# 源工程资料与接入目录约定

- 每个真实源工程一个 projects/<源工程ID>/；先读 docs/integration/README.md、项目 README/source.json 和根 AGENTS.md。
- README列出文档与能力位置，source.json 记录 A 来源/版本；upstream/research 保存内部证据，不列入公开清单。
- 对应项目的 newapi/<能力ID>/ 维护接入/测试、channel.md、公开契约；releases记录真实客户与账单/部署结果。直接渠道不强造插件，自定义插件遵循当前官方类型/schema。
- 新能力/渠道核对源工程 ID、能力 ID、插件 key、channel ID分别唯一归属。相同客户协议多源头选唯一契约维护者，其余项目明确链接，禁止重复登记覆盖。
- 原始秘密/敏感证据放 .local/projects/<源工程ID>/；公开规范只用客户 Key占位符。公共名称、URL和错误不暴露上游身份/内部凭证。
- 修改插件参数/响应同时改测试与公开规范/指南/版本；真实入口验收后发布。自动测试无管理写入/付费任务。目录迁移不会部署 B 或迁移配套服务。
- 改共享登记/配置先读当前值，只合并本次条目；保留其他项目工作与无关历史。
