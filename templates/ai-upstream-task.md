# 发给 A 的 AI：完成业务、New API 接入和客户文档

你负责 A：实现功能的源工程。C 是统一接入与文档中心 G:/workspace/xyapi_doc；B 是正在运行的 New API 服务，不需要再向另一个 B 的 AI 交接。

本次能力：【填写名称；上下文已明确就从上下文确定】。

请先读 A 的工程规则，再读：
- G:/workspace/xyapi_doc/AGENTS.md
- G:/workspace/xyapi_doc/START_HERE.md
- G:/workspace/xyapi_doc/newapi/README.md

你最熟悉 A 的 API，请直接把本次 New API 接入代码、适配测试和客户文档写到 C，完成可执行交付，不只输出方案：

1. 核对 A 真实实现、接口、鉴权、限制、响应、异步/流式行为及实际部署版本，运行 A 适用测试。
2. 查看 C 已有能力，确定复用还是新增稳定能力 ID。业务修改在 A；插件/适配器和客户契约在 C 的 projects/<源工程ID>/newapi/<能力ID>/。
3. 按 C 现有模式实现客户鉴权链路、参数与模型映射、结果/错误转换和计费。非模型功能不虚构模型参数，相同客户协议的多个渠道复用原能力。
4. 按已有授权部署/启用到 B，使用客户 Key 验收成功调用、非法输入、异步/流式/下载和实际账单。管理凭证从 C 的加密本机目录加载，不输出。修改共享价格/渠道前读取当前值，只合并本次条目。
5. 在 C 同一能力目录维护 public-openapi.json、public-guide.zh.md、public-guide.en.md、public-docs.json。它们描述客户经过 B 看到的接口，不把 A 的内部响应直接作为客户规范。
6. 分类、modelDetails、模型分组与选型章节按 C 的 docs/maintenance/model-catalog-contract.md；使用 templates/public-docs.json，新能力在 sources.json 登记 C 自身，已有能力更新原项。
7. 按 C 的 templates/api-release-handoff.md，在 projects/<源工程ID>/releases/<能力ID>/<版本>.md 保存一份脱敏交付记录，链接 A 源码与部署证据，记录 B 启用版本、客户与计费验收。
8. 在 C 运行 npm test、npm run docs:sync、npm run build、npm run docs:check，核对公开页面和调试。测试不发付费请求；真实业务验收单独记录。验收后按会话已有授权发布本次 A/C 相关文件，确认 B 实际运行与 Cloudflare 实际部署两个结果。

多个 A 的 AI 各负责独立能力目录，修改共享文件前检查 Git 和进行中的工作。保留其他任务修改与前端历史，不 git add .，不整块推送无关历史。

不能验证或部署的内容标为待验证/未部署，不把源码 push、上传插件、管理员 dry-run 或 401 说成业务验收成功。公开文件不含真实 Key、渠道密钥、内部管理信息或成本。

完整 SOP：G:/workspace/xyapi_doc/docs/maintenance/api-release-sop.md。完成后返回能力 ID、A/C 改动位置、实际运行版本、验收/计费结果、交付记录路径、文档部署状态。无需我手填 JSON 或再把接口说明抄到 C。不要未经我授权向其他任务发送消息。


完整技术规范：G:/workspace/xyapi_doc/docs/integration/README.md。项目索引：G:/workspace/xyapi_doc/projects/README.md。
先在 projects/<真实源工程ID>/ 保存 README、source.json、upstream/api.md、research/newapi-integration.md；能力目录补 channel.md。项目模板在 templates/source-project/。C 的文档作者先读项目资料和验收证据，再导入客户契约。
