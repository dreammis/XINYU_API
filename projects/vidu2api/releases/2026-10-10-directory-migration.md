# 2026-10-10：vidu2api 目录集中与只读核对

本次任务：补齐 A 的接入规范与 C 的资料需求，将该源工程的插件和客户文档按项目归档。不是新能力上线或新的业务生成验收。

## 改动

- 原 C newapi/integrations/ 中两项能力和 public-contract.test.mjs/import-record.json 移入 projects/vidu2api/newapi/。
- 插件 key/版本/JS字节不变；两个 public-docs.json 与 sources.json 的维护路径更新，能力ID/客户页面路径不变。
- C 新增 source.json、upstream/api.md、research/newapi-integration.md、两份 channel.md、项目入口与索引。
- 给 A 的完整规范在 docs/integration/，项目模板在 templates/source-project/。
- 官方 v1.0.0-rc.41 插件契约/类型/schema与许可证、固定提交/hash保存 newapi/reference/。
- 根测试与共用 inspect.ps1 改读项目目录；构建快照重新从 C 原始契约导入。

## 只读环境核对

2026-10-10 使用已授权管理凭证，身份ID1核对通过；B v1.0.0-rc.41，有12个任务插件。
- media-image 1.2.0、media-video 1.0.0均 enabled/active。
- 新项目路径的两份 plugin.js SHA256 与 B source_hash 均一致。
- 渠道22 image-studio/type61/status1/default/priority100/weight0，绑定media-image。
- 渠道23 video-studio/type61/status1/default/priority0/weight0，绑定media-video。
- 两渠道当前A base_url为https://vidu2api.cgssoccer.com；无参数/头覆盖，图片无渠道model_mapping，视频有。
- 本机只读原始记录在 .local/newapi/inspection.json、vidu2api-channels.json；不公开凭证/渠道key。

源码、版本和渠道字段的核对不代替当前生产配套服务、成功生成与价格/退款验收。本次没有管理写入或付费生成。

## 历史客户验收与当前状态

A 视频历史验收在 docs/newapi_video_results/2026-10-03/README.md；图片历史结果在 docs/newapi_image_channel_results/2026-10-03/。费用、成功/失败结果按原日期引用，不标记本次重跑。

图片入口源码仍在 A 的 stream-proxy，按其说明运行在 B 入口侧；视频资产服务仍依赖 A 内部队列。仅插件/客户文档集中到 C，不宣称配套服务源码或部署已迁移。

本次新目录/资料为 C 本地工作区状态，未推送本批文件，未部署 B 或 Cloudflare。本机导入 provenance 如实保留未提交标记。

## 验证

- npm run docs:sync：media-image/media-video从本项目新路径成功导入。
- npm run build：成功，生成50份可移植文件、264站点输入、14模型页、8调试操作。
- npm run docs:check：生成与本地链接一致，两份OpenAPI有效。
- npm test：74项通过；包含两个插件和公开示例的真实解码器校验，不发付费请求。
- 14份入口/规范的65个本地链接均可解析，旧活跃接入路径引用为0。
- 1128份文本扫描中管理员Token匹配为0；构建站点没有项目source.json/channel.md、管理脚本、凭证或内部研究等文件。
- 迁入11份原文件哈希与记录一致，官方参考原文件哈希与provenance一致。

后续发布按 docs/maintenance/api-release-sop.md，保留其他前端历史和任务修改，只带本次必要接入/文档文件。
