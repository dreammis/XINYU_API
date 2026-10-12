# vidu2api 视频渠道与依赖

这是内部接入说明，不加入 public-docs.json。2026-10-10 对 B 做只读渠道核对；不是新的生成或价格验收。

| 项目 | 当前读取结果/依据 |
| --- | --- |
| B | https://openai.2yanx.dpdns.org，v1.0.0-rc.41 |
| 渠道 | ID23，video-studio，type61，status1 |
| A base_url | https://vidu2api.cgssoccer.com |
| setting.task_plugin_key | media-video |
| 插件 | 1.0.0，已启用/active，源码哈希与本目录 plugin.js 一致 |
| group / priority / weight | default / 0 / 0，本实例值 |
| models | cogvideo-fast、cogvideo-pro、cogvideo-basic、cogvideo-short |
| model_mapping | 存在；buildSubmitRequest 用 ctx.upstreamModel 映射为 A 调用名，不新增第二层映射 |
| param_override / header_override | 无 |
| 上游凭证 | 已在 B 渠道配置；本次不提取/输出值 |
| 管理凭证 | C .local/newapi/admin.credential.xml，由加载脚本使用 |
| 客户身份 | 客户 Bearer Key；管理员 Token 不能当业务调用 Key |

原始只读记录在 C .local/newapi/vidu2api-channels.json，已按字段选取，不包含 key。

## 任务、产物与计费

插件将客户 seconds/size/JSON或multipart参考图变为 A 请求，submit 调 A /v1/videos，query 调 /v1/videos/{上游ID}；客户状态为宿主任务，产物由 B /content 代理，不公开 A URL或内部模型。Responses 声明 stream/sync/background，生产长任务按已有决定使用异步或 stream。

插件 extractUsage 返回 null，沿用当前实例固定 ModelPrice，不按 duration 增倍。2026-10-03 历史验收默认分组每成功视频 USD0.04109589，29任务26成功3失败，失败终态 quota0。此价格/退款来自当时记录，本次未重新查价格或发任务验证，不能当新验收。

客户各模型限制和费用说明只维护同目录 public-openapi.json、双语指南。若改变计费单位/公式，需要同步插件用量、B 配置、真实账单与公开说明。

## 配套服务与历史部署工具

A 源码：G:/workspace/vidu2api/integrations/newapi/media-video/asset-worker/，配合 A 内部资产队列和取源/回传API；业务/运行依赖按 A README 和实际环境核对。当前源码未迁入 C，生产服务未因插件文件移目录重新部署。

live.py 在 A 同目录：setup/configure 会上传/改配置，submit/extra/responses/final/accept 会创建付费任务；固定价格、渠道、ROOT和历史证据路径。deploy_assets.py 是旧 SSH 目标与资产服务部署工具。它们不是通用接入模板，禁止机械照搬后盲目运行。

升级考虑在途任务：源码版本变化后的轮询仍需解析原任务数据。回退不能只改文档或删除价格条目；先按实际任务/服务情况回退接入与依赖，仅合并本次配置，不影响并行图片渠道。

## 验证

根 npm test 覆盖插件字段/状态/内容/用量与公开示例。业务验证需要客户Key成功请求、GET/HEAD/Range/Responses真实结果以及实际账单；dry-run 与401仅验证局部。

历史依据 A docs/newapi_video_integration_research.md、docs/newapi_video_results/2026-10-03/README.md。当前变更产生的客户/计费与文档发布证据写 projects/vidu2api/releases/media-video/<版本>.md。
