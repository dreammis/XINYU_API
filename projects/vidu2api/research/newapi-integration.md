# vidu2api 的 New API 接入选择与研究

核对日期：2026-10-10。本项目身份/源码版本见 ../source.json；B 版本 v1.0.0-rc.41；官方 tag commit 2035a82aeb5414253a728bd937d4b8f97aa99b9b。插件契约副本在 ../../../newapi/reference/v1.0.0-rc.41/plugin-api/，带来源与哈希。

## 本项目选择

| 能力 | 当前实现 | 为什么不能只改渠道地址 |
| --- | --- | --- |
| media-image | C 的自定义任务插件 + 现有图片入口服务 | 公共名称映射、参数边界、JSON/multipart 编辑、结果隐私与 usage facts 需适配；SSE/进度由配套入口实现 |
| media-video | C 的自定义任务插件 + A 资产配套服务 | seconds/size/参考图、异步状态、视频下载、Responses 与固定按次计费有实际协议差异 |

本次不新建插件，而是迁入已运行插件并维护项目目录。两个插件 key 未改名；代码哈希与 B 已启用版本一致，本次重查结果写 ../releases/2026-10-10-directory-migration.md。

## 已读证据

- A gateway/app.py、schemas.py、image_generation.py、video_generation.py；A 原文档位置与哈希见 source.json。
- C 本项目两个 plugin.js、plugin.test.mjs 和 public-contract.test.mjs，公开请求示例由实际解码器校验。
- 官方 docs/plugin-api/README.md、v1.md、v1.d.ts、v1.schema.json。
- 官方同提交 model/channel.go、constant/channel.go、router/api-router.go、controller/task_plugin.go，研究下载放 C .cache/newapi-research/。
- 只读 GET /api/channel/ 列表确认：图片渠道22、视频渠道23，均 type61、status1，分别绑定 media-image/media-video；无参数/头覆盖。
- 历史业务结果来自 A docs/newapi_video_results/2026-10-03/README.md，不能写成今日新验收。

## 关键差异与执行位置

图片映射执行在插件内，当前渠道无 model_mapping；usage facts 为 image_count/resolution，Lite 有单独 profile。插件只向 A 要自有 URL，客户 Base64/SSE/进度要核对图片入口。

视频映射当前在渠道存在，插件 buildSubmitRequest 消费 ctx.upstreamModel；公开时长不作为费用倍率，extractUsage 返回 null 沿用固定 ModelPrice。A 完成 URL 只用于宿主下载代理，客户拿 B 产物地址。host Responses 协议、产物分享地址/保留由 B 宿主实现。

相关配置证据与配套代码位置见 ../newapi/media-image/channel.md、../newapi/media-video/channel.md。不能只靠 sourceHash 一致推断这些配套服务/价格都未变。

## 已有业务决定与仍需核对的范围

已有决定：公开图片/视频名称沿当前清单；视频长任务用异步或 stream；历史视频默认分组每成功视频 USD 0.04109589，失败退款。已有决定不重复问。

本次只读未重新核对价格、完整模型管理、全部配套服务生产镜像、成功调用账单和数据保留。未需要修改这些内容，因此不发新的付费请求/管理写操作。下次变更影响这些行为时先查当前配置/记录，再按统一规范做真实验收；新业务范围、售价/分组或保留要求确实缺失时集中向用户确认。

本次不是“发现 A 里还有语音就自动上线语音”。新增语音或其他功能需要完成它自己的研究、渠道、客户契约与账单验收。

## 后续作者怎么继续

先读 ../../../docs/integration/README.md。实际部署脚本仍在 A：图片 stream-proxy 的 compose 与 README、视频 live.py/deploy_assets.py 的历史环境设置。后两者含固定价格/路径，不能当通用配置工具运行；核对真实请求与目标后只修改本次能力。若迁移配套服务源码，先迁源码/测试/部署入口并验证，不能只复制文件宣称迁了运行环境。

## TTS 追加验收（2026-10-11）

Vox 1 已独立接入 type61 渠道24，media-tts 1.0.0，POST/GET /tts/v1/tasks。A 持久任务与 claim 租约恢复原账号/原 remote ID；B 默认分组成功固定扣6849 quota，约 ¥0.10，失败退款。六次客户验收五成功一失败，中文2500字/英文5000字符成功，失败因账号代理出口403，终态0费用。公开契约和音色试听由 newapi/media-tts 唯一维护；详细边界/报价及证据见 channel.md 和 releases/media-tts/1.0.0.md。
