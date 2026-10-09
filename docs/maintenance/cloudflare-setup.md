# Cloudflare Pages 托管

最终采用自建 VitePress + Vue 文档主题 + Scalar 请求客户端，部署至 Cloudflare Pages。GitBook 自定义域名需要付费，用户已选择 Cloudflare；此前 GitBook 导入保留作历史记录。

## 项目设置

| 设置 | 值 |
| --- | --- |
| Account | 66d933ac3f93123e0c92c8c2858a549a |
| Pages project | xyapi-docs |
| Project ID | 6126afe4-ebaa-4b67-bc10-c5d0bdfdce58 |
| Git repository | dreammis/XINYU_API |
| Production branch | master |
| Root directory | 仓库根目录 |
| Build command | npm run build |
| Output directory | site/.vitepress/dist |
| Node version | 22 |
| Default domain | xyapi-docs.pages.dev |
| Requested custom domain | doc.2yanx.dpdns.org |

GitHub 已在 Cloudflare 关联，production_deployments_enabled=true。Pages 自动构建不需要在仓库保存 Cloudflare Token。每次推送 master 会部署生产站，其他分支部署预览。

## 构建与接口调试

`npm run docs:generate` 校验来源快照并生成 Markdown、OpenAPI、导航和调试允许列表。`npm run build` 再构建静态站。`site` 中的主题和公共静态配置手写维护，各语言页面自动生成。新能力不需要另写前端路由。

接口页从同一份公开规范生成字段、响应与代码，Scalar 请求客户端仅在点击调试时加载。公开规范可从本站 `/openapi/<能力>.json` 下载，在线请求通过同源 `/api-proxy` 转发。目的地、路径与方法必须匹配公开规范。客户填写自己的 Bearer Key；无服务器管理员 Key，不持久化浏览器鉴权，不发送 Cookies，不记录密钥，不缓存接口响应。multipart、SSE 和下载响应流式转发；上游重定向明确报错，需在客户自己的客户端跟随。

文档静态访问使用 Pages 静态托管，调试请求使用 Pages Functions 免费额度；实际生成仍按 New API 账户正常收费。测试不应调用付费生成接口。

## 自定义域名

域名已加入 Pages 项目，Cloudflare zone 为 2yanx.dpdns.org，zone ID b98deb6936d8c1d8df1ee617a2e9da1f。

DNS 需要添加以下记录：

| 类型 | 名称 | 目标 | 代理状态 |
| --- | --- | --- | --- |
| CNAME | doc | xyapi-docs.pages.dev | 已代理（橙色云） |

Pages 自定义域名已关联，当前状态为 pending，verification_data.error_message 为 `CNAME record not set`。2026-10-06 的 DNS 查询返回“DNS 名称不存在”，因此尚不能把自定义域名作为可用站点地址。

当前 Wrangler OAuth 可操作 Pages，但没有 DNS 编辑权限；DNS API 实际返回 403 Authentication error。DNS 变更需通过有权限的 Cloudflare 控制台完成。添加记录后以 domain.status=active、DNS 解析及公开 HTTPS 页面核验为准，不能只凭关联成功认定上线。

## 验收与接线记录（2026-10-06）

- 生产站已上线：[中文](https://xyapi-docs.pages.dev/zh/)、[英文](https://xyapi-docs.pages.dev/en/)。中英文首页、接口参考页及两个公开 OpenAPI JSON 的 HTTP 检查通过。
- 已创建 GitHub 关联的 Pages 项目，已加入请求的自定义域名。GitHub master 推送已实际触发 Cloudflare 自动构建并成功部署。
- 验收部署 ID：eb0bb7c3-d0f8-4260-8304-d2d4c46e82ec；触发提交：3acb66829836fc779a8a7fc963c0dfa310fd45df；deploy stage 为 success，完成时间 2026-10-06T09:12:14.685532Z。
- 对应 [GitHub CI](https://github.com/dreammis/XINYU_API/actions/runs/37441190355) 成功。
- 生产静态构建、公开 OpenAPI 校验、10 项测试和 Pages Function 编译通过。
- 本地浏览器调试查询使用无效测试 Key 收到 New API 的真实 401 JSON，证明请求能经过本站代理到达公开网关；未发起付费生成。
- 生产 `/api-proxy` 的视频查询和图片生成鉴权检查均使用无效测试 Key，收到 New API 的真实 401 JSON；未使用真实客户凭证，也未创建付费生成任务。
- 线上中文搜索弹窗正常加载，搜索“图片”返回接口、指南、快速开始等匹配结果；语言菜单切换到英文首页后，导航和内容显示英文；浏览器控制台未出现错误。
- 自定义域名仍等待上述 CNAME 记录及证书激活；当前可用地址为 pages.dev。
- 源工程自动导入的发布文件和跨仓库 Secrets 尚未完成，状态见 public-docs-workflow.md；文档仓库到 Pages 自动部署已验证成功。

Cloudflare 构建环境自带的 Wrangler 3.114.17 不支持 JSON import attributes，调试允许列表因此生成普通 ES 模块 `site/public-endpoints.mjs`。不要改回 `import ... with { type: 'json' }`，否则 Pages Functions 编译会失败。

## 系列导航与模型中心改版验收（2026-10-10）

- 改版实现提交：`4c914272873149ce0ee3b52b15a99aab87c96ffe`。仅从独立文档发布工作区推送生产分支，主目录既有 Next/Fumadocs 历史及其他未提交工作保留。
- GitHub master 推送触发生产部署 `3041e150-6787-43cc-9236-f42f5c5993e2`；Cloudflare API 确认 deploy stage 为 success，完成时间 `2026-10-09T16:46:07.240495Z`（北京时间 2026-10-10）。
- 顶部按 API 手册、模型中心、接入指南和常见问题组织，左侧按真实能力系列展开。新增系列总览、源指南选型章节、模型搜索与分类筛选，以及 14 个公开调用名称的中英文详情入口（图像 10 个、视频 4 个）。这些来自已导入契约，不代表本轮重新验收 14 个模型的生成服务。
- 接口参数、约束、响应和三种语言代码从一份公开规范展示，调试客户端点击后加载。移动端折叠代码与调试区域。未发布的 TTS、音乐、文字、转写等系列明确显示状态，不生成假接口入口。
- 发布工作区 `npm run build`、`npm run docs:check`、`npm test`（13/13）及 `wrangler pages functions build` 通过，暂存契约文件的 SHA-256 与 provenance 逐项一致。
- 本地浏览器验证了系列与模型独立目录、视频筛选、模型搜索、全文搜索、中英文路径切换、接口模板和 390px 移动端布局；未发现页面横向溢出或控制台错误。模型示例只保留必填字段，避免把其他模型的 4K 或时长参数搬到 Lite、short 模型。
- 生产中英文首页、模型中心、图像与视频系列页均返回 200。生产浏览器已加载新首页与模型目录；原始图片、视频 OpenAPI 下载分别与导入快照 SHA-256 `90951bbc80bda1c1a425e0287ef688c51918f30b24133135222226b68c202c58`、`c36cb22f52816e1a3bc59afbd748bab73cb490d0b93a95af90c108983a925116` 一致。
- 本地 Scalar 请求客户端和生产 `/api-proxy` 均使用虚构无效 Key 查询视频任务，收到 New API 的真实 401 JSON；生产响应带 `Cache-Control: no-store`。未使用真实客户凭证，未发起付费生成调用。
- 页面和规范使用当前导入的图片 1.2.0、视频 1.0.0；本轮没有手改客户请求协议。图片来源 revision 为 `c3277c83bc408ef12cd01834ca1c7b1913324131`，无未提交公开文件变化；视频快照如实保留源公开文件的 untracked 状态。源到文档的完整远端自动同步仍按 public-docs-workflow.md 中的条件接线。
- 新能力交付字段与选型章节约定已写入 model-catalog-contract.md，配套上游、New API 接入和文档工程任务说明已更新。
- 本日重新核对自定义域名：`doc.2yanx.dpdns.org` 仍为 pending，Cloudflare 返回 `CNAME record not set`，DNS 查询为名称不存在。当前正式访问地址仍是 `https://xyapi-docs.pages.dev/zh/`。

官方资料：[Git 集成](https://developers.cloudflare.com/pages/configuration/git-integration/)、[自定义域名](https://developers.cloudflare.com/pages/configuration/custom-domains/)、[Pages Functions](https://developers.cloudflare.com/pages/functions/)。
