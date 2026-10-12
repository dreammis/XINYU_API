# 给 A 的 AI：接入与文档入口

**A = 业务源工程；B = 运行中的 New API；C = G:/workspace/xyapi_doc 接入与文档中心。** 你是 A 的 AI，在 A 维护业务，在 C 中对应源工程目录完成接入与客户文档。

1. 读 C 的 AGENTS.md，再从 **[docs/integration/README.md](docs/integration/README.md)** 进入完整规范。里面包含研究路径、接入方式判断、插件契约、渠道配置、需要用户决定的问题和交付要求。
2. 从 **[projects/README.md](projects/README.md)** 找自己的源工程。已有目录就更新；新工程按 templates/source-project/ 建立 projects/<真实源工程ID>/，不创建 A1/A2 这样的代号目录。
3. 在 A 核对真实 API，在 C 的项目目录保存 upstream/api.md、research/newapi-integration.md，选择直接内置渠道、复用/自定义插件或独立适配服务。插件不是所有功能都必需，但用插件时仍要配置渠道。
4. 在 C 的 projects/<源工程ID>/newapi/<能力ID>/ 写接入实现/测试、channel.md 和四个公开客户文件。按照现有授权部署到 B，用客户 Key 验收业务与账单，并在项目 releases 保存脱敏版本证据。
5. 新公开能力登记 sources.json 一次，运行 npm test、npm run docs:sync、npm run build、npm run docs:check；按已有授权发布本次文件，核对 B 运行与 Cloudflare 文档两个部署结果。

凭证加载与只读检查在 [newapi/README.md](newapi/README.md)。不输出管理员/上游密钥，不将管理秘密放进客户规范或站点。多个 A 各改自己的项目目录；共享登记/配置先读取再合并，保留其他工作。

本次实际项目是 **[projects/vidu2api/README.md](projects/vidu2api/README.md)**：A 为 G:/workspace/vidu2api，C 已集中其图片和视频插件/契约。详细发布顺序见 [SOP](docs/maintenance/api-release-sop.md)。

C 内部资料按源工程归档，客户站按公开能力/模型组织。源工程 ID、能力 ID、插件 key、运行渠道 ID是不同信息；同协议多渠道复用唯一公开契约，不重复创建页面或覆盖注册 ID。
