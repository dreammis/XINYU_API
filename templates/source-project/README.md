# 新源工程项目模板

给 A 的 AI 使用。先读 G:/workspace/xyapi_doc/docs/integration/README.md，再把本模板目录内容用于 projects/<真实源工程ID>/，按实际代码与研究填写，不把模板未知值写成事实。

创建后产出：
- README.md：项目是什么、A 在哪里、各资料/能力在哪里、当前状态。
- source.json：仓库/路径/版本/原文档和能力维护位置，未知项明确待确认。
- upstream/api.md：A 内部真实接口和客户协议差异。
- research/newapi-integration.md：直接渠道/插件/服务选择、固定版本依据、业务决定和待验证。
- newapi/<能力ID>/channel.md、实际接入代码与测试、四个客户公开文件。
- releases/<能力ID>/<版本>.md：用根 templates/api-release-handoff.md 的结构记录真实验收和文档发布。

不预建 plugin.js：先研究再决定。直接内置渠道仅写真实配置/验证；需要自定义任务插件才开发 plugin.js。独立服务用真实职责命名文件和目录。

公开清单使用根 templates/public-docs.json，修改源工程ID/能力ID、路径、版本。项目 source.json 与公开 public-docs.json 用途不同，source.json 不导入客户站。

完成后在 projects/README.md 登记项目入口，在根 sources.json 登记已验收公开能力。同一客户协议多源头引用一个契约维护位置，不重复注册ID或制造第二份参数表。

这个 README 迁入后改写为实际项目入口，删除模板提醒并链接真实资料；source.json 的 null/[] 是模板未知项，不是已验证无功能。
