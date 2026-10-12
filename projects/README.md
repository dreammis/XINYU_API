# 源工程目录索引：给 C 的维护者

每个源工程在本目录有自己的资料、接入实现和客户文档。技术接入规范在 [docs/integration](../docs/integration/README.md)，A 的 AI 按它完成交付；C 从项目 README 找资料，按 [交付契约](../docs/integration/delivery-contract.md) 检查输入。

| 源工程 | A 的实际目录 | C 的项目入口 | 已集中能力 |
| --- | --- | --- | --- |
| vidu2api | G:/workspace/vidu2api | [vidu2api/README.md](vidu2api/README.md) | media-image、media-video |

本次处理的实际源工程是 vidu2api。A1/A2/A3 只是对多个源工程的举例，不建立这些代号的空项目目录。其他 G:/workspace 工程尚未逐项盘点与交付，不因为名字/旧页面存在就标记已接入。

## 后续新工程

复制 [项目模板](../templates/source-project/README.md) 到 projects/<真实源工程ID>/，由该 A 的 AI填充 source.json、upstream、research、接入目录和验收记录。在本索引新增项目入口；只有已验收公开能力才进入根 sources.json 的正式发布来源。

C 按源工程保存内部资料，客户站按公开能力和模型导航。多个源工程实现同一客户协议时，它们各保留项目资料和渠道证据，选一个目录维护唯一公开契约；其他目录链接它，不重复登记同一能力 ID。相同能力新写独立插件时还需核对宿主协议冲突与模型路由。

本目录不是网站静态资源目录。只有 sources.json → public-docs.json 明确列出的公开文件被导入；source.json、上游说明、research、channel.md 和内部 releases 不自动发布。
