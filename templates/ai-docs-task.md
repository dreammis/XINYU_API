# 发给 C 的维护 AI：核对接入交付并发布文档

你维护 C：接入与文档中心 G:/workspace/xyapi_doc。A 是实现功能的源工程；B 是运行中的 New API 服务。默认 A 的 AI 已在 C 完成适配器和公开文件，你负责公共规则、汇总校验与发布，不重新抄参数。

交付记录：【填写 C 的 projects/<源工程ID>/releases/<能力ID>/<版本>.md 或外部交付路径】。
能力/清单：【填写 ID 或 public-docs.json 位置】。

先读 AGENTS.md、START_HERE.md、docs/maintenance/api-release-sop.md、newapi/README.md。

当前在线调试采用 VitePress/Vue + JSON Forms（MIT）。正文和“试一试”从同一份 OpenAPI 读取参数说明、默认值和限制；来源字段应提供 description 与中文 x-description-zh，并写明省略参数时的行为。表单说明必须直接可见，显示校验错误后也保留；新增能力在浏览器实际验证当前模型／模式、实时输入、文件数组和响应展示。

1. 读取适配器、公开文件与交付证据，核对 A 业务版本和 B 真实启用/验收结果。未验收能力只做本地预览，不发布为已可用。
2. C 的 projects/<源工程ID>/newapi/<能力ID>/ 是集中能力的唯一客户协议维护入口；sources.json 登记 C 自身。相同协议的多个渠道复用同一能力。确实留在外部维护的契约才登记外部仓库，不做第二份副本。
3. 按 docs/maintenance/model-catalog-contract.md 核对 category、modelDetails、modelGroups 和 selectionSections。分类不靠名字猜，选型章节直接引用指南，标题缺失明确失败。
4. 先 npm test 验证真实适配逻辑；npm run docs:sync 导入 C 本机公开文件，再 npm run build、npm run docs:check。按现有 CI 编译 Pages Function。外部远端发布需要时才用 docs:sync:remote。
5. 检查中英文导航、模型、接口、示例、规范下载与在线调试。调试使用客户 Key 和本站 /api-proxy，不引入管理员 Key 或第三方代理；401 不能替代业务和计费验收。
6. 修改契约回 projects/<源工程ID>/newapi/<能力ID>/，共用文案回 content；不手改 catalog、gitbook、site 自动生成页面或允许列表。
7. 本机有无关前端工作和未推送历史。复用适用的隔离发布工作区或基于远端生产分支准备本次提交，只发布本次接入/文档必要文件，不 git add .，不把无关历史整块推送。
8. 按会话已有授权发布并核对 Cloudflare 实际部署、公开页面与文档版本。C 文件发布不等于 B 已启用，网站旧 URL 可用不等于本次部署成功。
9. 在同一交付记录回填契约来源 SHA、未提交状态、检查结果、C 文档提交和部署链接。C 内维护无需给每个 A 再设置通知 Secret；确实使用外部通知时核对该段实际运行记录。

完成后返回中文/英文页面、客户接入验收状态、源码和文档版本、检查与部署结果、明确待完成项。不要未经我授权向其他任务发送消息。


完整技术规范：G:/workspace/xyapi_doc/docs/integration/README.md。项目索引：G:/workspace/xyapi_doc/projects/README.md。
先在 projects/<真实源工程ID>/ 保存 README、source.json、upstream/api.md、research/newapi-integration.md；能力目录补 channel.md。项目模板在 templates/source-project/。C 的文档作者先读项目资料和验收证据，再导入客户契约。

公共调试与正文必须共用字段约束和组合规则说明：范围、默认值、文件互斥输入及条件限制都要在发送前可读。修改表单／JSON 切换时检查无效草稿是否恢复为当前有效值；音色试听按钮必须与原生播放器的播放／暂停事件同步。
