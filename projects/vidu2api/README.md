# vidu2api：源工程资料、New API 接入与客户文档

**本次实际整理的 A 是 vidu2api，业务工程在 G:/workspace/vidu2api；C 中对应项目目录为 G:/workspace/xyapi_doc/projects/vidu2api。**

A 提供图片、视频及语音相关业务。C 集中维护图片、视频和语音的接入与公开契约。Vox 1 语音已于 2026-10-11 通过真实 B 客户入口与账单验收，记录见 releases/media-tts/1.0.0.md。

## C 从哪里读资料

| 资料 | 文件/目录 | 作用 |
| --- | --- | --- |
| 项目身份与版本 | [source.json](source.json) | A 仓库、路径、源码版本、原文档位置和能力目录 |
| A 上游接口及差异 | [upstream/api.md](upstream/api.md) | 不认识 A 的维护者理解内部 API 与客户协议区别 |
| New API 接入选择/依据 | [research/newapi-integration.md](research/newapi-integration.md) | 为何使用自定义插件、哪些配套服务仍在 A |
| 图片配置与依赖 | [newapi/media-image/channel.md](newapi/media-image/channel.md) | 图片实际渠道、插件、费用事实和 stream 依赖 |
| 视频配置与依赖 | [newapi/media-video/channel.md](newapi/media-video/channel.md) | 视频实际渠道、插件、映射、按次计费与资产服务 |
| 迁入与哈希证据 | [newapi/import-record.json](newapi/import-record.json) | 原 A 路径/版本及迁入文件哈希，历史管理核对 |
| 本次目录迁移状态 | [迁移记录](releases/2026-10-10-directory-migration.md) | 研究/只读验证与历史验收区分，本次部署状态 |

## 插件与公开客户文档在哪里

| 能力 | 插件/测试 | 客户文档 |
| --- | --- | --- |
| 图片 media-image | [plugin.js](newapi/media-image/plugin.js)、plugin.test.mjs | [中文指南](newapi/media-image/public-guide.zh.md)、[英文指南](newapi/media-image/public-guide.en.md)、[OpenAPI](newapi/media-image/public-openapi.json)、public-docs.json |
| 视频 media-video | [plugin.js](newapi/media-video/plugin.js)、plugin.test.mjs | [中文指南](newapi/media-video/public-guide.zh.md)、[英文指南](newapi/media-video/public-guide.en.md)、[OpenAPI](newapi/media-video/public-openapi.json)、public-docs.json |

[public-contract.test.mjs](newapi/public-contract.test.mjs) 直接校验两项能力的插件/模型/版本及请求示例。根 npm test 已读取本项目新路径，sources.json 已登记本项目两份清单；公开能力 ID 和页面路径保持 media-image/media-video。

A 的 integrations/newapi/ 旧插件与旧公开契约是迁入前副本，不再作为 C 文档来源。配套 stream-proxy、asset-worker 与历史部署工具尚在 A；它们的实际依赖与迁移边界在 channel.md 说明，不宣称全部接入服务已搬到 C。

## 后续修改

A 的作者先读 [统一规范](../../docs/integration/README.md)，更新本项目接入、客户契约和证据。业务仍在 A。本次公共客户协议集中到 C，但源码迁移不改变 B 运行服务；线上价格或在途任务需要独立核对。

本次只研究、调整 C 目录并读取已有渠道，未改插件、渠道或价格，未创建付费任务。新目录文件尚是本地工作区状态，不能当成远端发布完成。

## Vox 1 语音接入（2026-10-11）

新增 [media-tts](newapi/media-tts/channel.md)，公开模型 vox-1，成功按次约 ¥0.10。353 音色、345 个中性静态试听；真实中文2500字/英文5000字符边界、参数、下载和失败退款已验收。图片/视频目录迁移的历史状态仍按上述原记录；本次独立发布只带 TTS 和所需共享文档功能。
