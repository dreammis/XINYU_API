# 在 C 单独完成 New API 接入

该任务用于从 A 移交接入工作时；默认 A 的 AI 已按 START_HERE.md 同时负责接入，不要求额外开任务。

A 是业务源工程，B 是运行的 New API 服务，C 是接入与文档中心 G:/workspace/xyapi_doc。接入源码和客户契约维护在 C 的 projects/<源工程ID>/newapi/<能力ID>/。

上游信息：【填写 A 的目录、接口说明或交付记录；已有上下文直接核对】。
本次能力：【名称/ID】。

先读 C 的 AGENTS.md、START_HERE.md、newapi/README.md 和 docs/maintenance/api-release-sop.md。请在 C 实现或更新本次接入：

1. 核对 A 实际 API 与证据，确定客户入口、鉴权、参数转换、响应/错误、异步/流式与计费。
2. 查已有能力、插件与渠道。相同协议复用同一能力；按实际使用插件、内置渠道或适配服务，不为了文档制造封装。
3. 在 C 的能力目录完成适配实现与测试。管理凭证从本机加密目录加载；共享价格、渠道配置先读取再合并本次条目。
4. 按已有授权部署并启用到 B，用客户 Key 验收真实成功、错误、任务/下载和账单，记录运行源码哈希与版本。没有条件的项保持待验证。
5. 根据客户实际行为更新 C 的四个公开文件和版本，真实适配器校验公开示例。非模型能力 models 为 []。
6. 按 docs/maintenance/model-catalog-contract.md 交付 category 与可选 modelDetails。操作 ID 必须存在且确实支持该模型；标题 x-title-zh、说明 x-description-zh 补齐中文；选型章节引用同一指南，不复制第二份限制表。
7. 首次登记 sources.json 指向 C 自身，已有能力只更新原项。在 projects/<源工程ID>/releases/<能力ID>/<版本>.md 保存脱敏交付记录，链接 A 证据。
8. 运行 npm test、npm run docs:sync、npm run build、npm run docs:check；验收后按已有授权发布本次文件并确认 B 运行与 C 网站部署。C 内集中维护不需要 A 配置跨仓库通知 Token。

公开文件使用 templates/public-docs.json，路径相对 C 根目录；public-openapi.json 用 OpenAPI 3.1，版本与清单一致，引用仅内部、operationId 稳定唯一。不得输出凭证或在公开文件放管理接口、内部路由与成本。

保留其他任务工作，只合并本次条目和文件，禁止整份覆盖或 git add .。完成后给出代码/契约位置、启用版本、脱敏客户与账单证据、交付记录和文档结果，不让我手填 JSON。不要未经我授权向其他任务发送消息。


完整技术规范：G:/workspace/xyapi_doc/docs/integration/README.md。项目索引：G:/workspace/xyapi_doc/projects/README.md。
先在 projects/<真实源工程ID>/ 保存 README、source.json、upstream/api.md、research/newapi-integration.md；能力目录补 channel.md。项目模板在 templates/source-project/。C 的文档作者先读项目资料和验收证据，再导入客户契约。
