# Cloudflare Pages 托管

最终采用自建 VitePress + Scalar，部署至 Cloudflare Pages。GitBook 自定义域名需要付费，用户已选择 Cloudflare；此前 GitBook 导入保留作历史记录。

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

Scalar 从本站 `/openapi/<能力>.json` 加载规范，在线请求通过同源 `/api-proxy` 转发。目的地、路径与方法必须匹配公开规范。客户填写自己的 Bearer Key；无服务器管理员 Key，不持久化浏览器鉴权，不发送 Cookies，不记录密钥，不缓存接口响应。multipart、SSE 和下载响应流式转发；上游重定向明确报错，需在客户自己的客户端跟随。

文档静态访问使用 Pages 静态托管，调试请求使用 Pages Functions 免费额度；实际生成仍按 New API 账户正常收费。测试不应调用付费生成接口。

## 自定义域名

域名已加入 Pages 项目，Cloudflare zone 为 2yanx.dpdns.org，zone ID b98deb6936d8c1d8df1ee617a2e9da1f。

DNS 需要添加：CNAME，名称 doc，内容 xyapi-docs.pages.dev。Pages 自定义域名必须先关联再配置 DNS。当前 Wrangler OAuth 可操作 Pages，但没有 DNS 编辑权限；DNS 变更需通过有权限的 Cloudflare 控制台完成。最后以 domain.status=active、DNS 解析及公开 HTTPS 页面核验为准。

## 验收与接线记录（2026-10-06）

- 已创建 GitHub 关联的 Pages 项目，已加入请求的自定义域名。
- 生产静态构建、公开 OpenAPI 校验、10 项测试和 Pages Function 编译通过。
- 本地浏览器调试查询使用无效测试 Key 收到 New API 的真实 401 JSON，证明请求能经过本站代理到达公开网关；未发起付费生成。
- 生产上线、域名 DNS 和 HTTPS 状态待发布后更新。
- 源工程自动导入的发布文件和跨仓库 Secrets 尚未完成，状态见 public-docs-workflow.md；文档仓库到 Pages 自动部署已关联。

官方资料：[Git 集成](https://developers.cloudflare.com/pages/configuration/git-integration/)、[自定义域名](https://developers.cloudflare.com/pages/configuration/custom-domains/)、[Pages Functions](https://developers.cloudflare.com/pages/functions/)。
