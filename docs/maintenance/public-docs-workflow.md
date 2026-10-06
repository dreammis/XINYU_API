# 多工程接口文档发布流程

## 契约放在客户真正调用的那一层

源工程实现功能，接入层负责客户鉴权、参数转换、计费和结果表达。两层的请求响应可能不同。例如源工程使用 `duration` 并返回媒体 URL，客户通过 `seconds` 创建任务，再通过 `/content` 下载。因此公开文档以 **客户入口** 为准。

插件接入的契约放在插件旁，内置渠道或独立网关的契约放在对应接入目录，不必为了文档额外写插件。

图片中文直接引用 `integrations/newapi/media-image/README.md`，视频中文直接引用 `docs/video_studio_api.md`。各接入目录新增 `public-guide.en.md`、`public-openapi.json` 和 `public-docs.json`，汇总站不再抄写指南。

OpenAPI 描述路径、方法、鉴权、参数、默认值、响应和示例；指南说明跨参数限制、任务流程和收费语义。

## 新工程第一次接入

1. 在客户适配目录写好公开规范与指南。复制 `templates/public-docs.json`，填写能力 ID、名称、版本和文件路径，路径相对源工程根目录。
2. 在 `sources.json` 登记 repository、ref、localDirectory、manifest。每个能力 ID 唯一。
3. 执行 `npm run docs:sync`、`npm run build`、`npm run docs:check`，查看生成页面。
4. 把 `templates/source-docs-sync.yml` 放到源工程 `.github/workflows/public-docs.yml`；调整 paths 覆盖实际公开指南。设置 `DOCS_DISPATCH_TOKEN`，允许通知文档仓库。
5. 文档仓库设置私有源工程读取用的 `DOCS_SOURCE_TOKEN`。目标源工程只需要 Contents: read，公开工程无需此 secret。
6. 发布并验收接入代码后提交公开契约。契约 push 会通知文档仓库，也可以手动运行通知 workflow。

新能力可以是搜索、转写、文件转换或任何计费功能；HTTP 路径不限制为大模型协议，`models` 可以为空。

## 后续更新

只修改源工程适配器和对应公开契约。字段、默认值、限制或结果改变时更新规范版本和指南，保持公开示例测试通过。发布未完成时不要将待上线能力写入已发布契约。

源工程通知 → 文档仓库读取登记 ref → 记录提交 SHA 和哈希 → 构建与校验 → 提交 catalog/gitbook → Cloudflare Pages 自动构建部署。

通知不携带正文，汇总站只读取已登记文件。内部报告、调试 JSON、渠道密钥不会因为位于源工程就自动进入页面。

## 发布版本与运行版本

**源码合并不等于 New API 插件已经激活。** 文档必须对应已验收的客户入口。日常 ref 可指向只提交已发布契约的分支；严格固定版本时用 release tag 或提交 SHA。不要将含未上线接口的开发分支作为公开来源。

当前来源 ref 为 main。本次首次导入来自本机工作区，新增文件未提交，`catalog/*/provenance.json` 如实记录 workingTreeChanges。因此 GitHub 自动导入尚未具备全部远程文件。

文档仓库本次已发布到 master 并导入 GitBook，首次展示的是已经校验的本机快照。自动远端导入还需先提交源工程公开导出文件和已上线适配器。图片 plugin.js 原本尚未跟踪，源工程发布提交必须包含实际插件；否则公开契约测试无法读取其实现。不要只提交测试而漏掉实现。

源工程 integrations/newapi/AGENTS.md 和文档仓库 AGENTS.md 已记录维护入口，让后续代码助手随接口改动更新公开契约。当前托管、自动部署与域名状态见 cloudflare-setup.md；GitBook 历史状态见 gitbook-setup.md。

## 修改入口与退役

catalog 是只读快照，gitbook 是构建结果。手改快照触发哈希错误，手改生成页触发构建差异。修改应回到源工程公开文件或本仓库 content。

Cloudflare 从本仓库构建，修改通用文案时编辑 content，修改接口时编辑源工程公开契约。gitbook 是可移植导出，site 各语言页面在构建时生成；不直接修改生成页面。

能力下线时移除登记项并更新共用指南链接，然后构建。生成器删除已退役页面与规范，不会悄悄修补作者写错的链接。

## 同一能力的多个渠道

多个渠道如果提供相同的路径、参数、响应和计费语义，只维护一份公共契约，渠道选择留在内部路由。客户需要选择模型或参数时，在同一指南描述差异；协议流程不同则分别说明。

每个能力独立导出 OpenAPI，不合成一个全局规范，避免多个能力共用 `/v1/responses` 等入口时互相覆盖。站点自动导航负责汇总。
