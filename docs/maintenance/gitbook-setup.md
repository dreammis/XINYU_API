# GitBook 首次托管设置

GitBook 插件已连接，已在组织 `-LReNmlWasTFD0ptGuSE` 创建并发布 XY API Basic 网站 `site_L6ohK`。中文：<https://system-design-primer.gitbook.io/xy-api/>；英文：<https://system-design-primer.gitbook.io/xy-api/en/>。管理入口：<https://app.gitbook.com/o/-LReNmlWasTFD0ptGuSE/sites/site_L6ohK>。原生 Git Sync 的状态见本文末尾记录。

## 推送来源

1. 源工程 dreammis/vidu2api：提交两个目录的 public-docs.json、public-openapi.json、public-guide.en.md，公开契约测试及 .github/workflows/public-docs.yml。实际已上线插件也必须存在于该发布 ref。
2. 文档仓库 dreammis/XINYU_API：提交 content、catalog、gitbook、脚本、清单、GitBook 配置和 workflows。只选择迁移文件，原有未提交前端工作由原任务处理。
3. 首次从 GitHub 导入后重新构建，替换本机 workingTreeChanges 记录，不能将工作区快照标成已发布源码。

## 连接 GitBook

创建或选择网站 XY API，启用 GitHub Git Sync：

| 设置 | 值 |
| --- | --- |
| Repository | dreammis/XINYU_API |
| Branch | master，或实际文档发布分支 |
| 中文空间 / Project directory | NffagFSNEMYHNBZF4XiM / gitbook/zh |
| 英文空间 / Project directory | tcgo5Wpp4DDLs4RvPM6J / gitbook/en |

首次选择 **从 GitHub 导入**。当前网站采用两个语言空间，各空间分别绑定同一仓库、分支及上表目录，读取各目录 .gitbook.yaml 和 SUMMARY.md。网站路径分别配置为 zh、en；GitBook 将默认中文空间发布在网站根路径，英文在 /en/。

根目录 gitbook-docs.yaml 保留与当前网站一致的结构，供以后使用整站 Git Sync；当前空间独立绑定不依赖根目录配置。若改为整站绑定，先在 GitBook 关联现有空间 key xyapi-docs-zh / xyapi-docs-en，避免建立重复空间。

参考站采用侧栏分组、中央正文和页内目录。导航已分为开始使用、能力指南、API Reference。GitBook 提供搜索和移动端布局；在网站定制中设置 XY API 标识、颜色和控制台链接。

## 交互接口块

生成页含官方 OpenAPI 块，读取公开仓库规范：

```text
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-image.json
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json
```

两个地址已推送且可公开读取。参数交互和 Test it 由 GitBook 提供，用户发起生成会正常计费。当前文档仓库经 GitHub API 核实是公开仓库；以后改私有或换分支时更新 sources.json 的 specBaseUrl，或把规范上传 GitBook 并调整块来源。

生成器在接口块 URL 加上规范内容哈希作为 version 查询参数；规范修改后导入地址也随之改变，让 GitBook 重新读取新版。URL 来源的后台自动检查通常约每 6 小时执行，Markdown Git Sync 和该后台检查是两个流程。需单独刷新旧来源时在 OpenAPI 中 Check for updates，或按官方 CI/CD 更新规范。原生 Git Sync 的日常 Markdown 同步不要求在仓库保存 GitBook token。

## GitHub 权限

- 文档仓库 DOCS_SOURCE_TOKEN：读取私有源工程，目标源工程 Contents: read。
- 源工程 DOCS_DISPATCH_TOKEN：向文档仓库 repository_dispatch 发送通知，目标文档仓库 Contents: write。
- 文档仓库 Actions 自带 GITHUB_TOKEN 提交结果，需允许 Actions 写内容。默认分支禁止直接提交时应改为 PR 更新流程。

密钥放在 Actions Secrets，不放规范、Markdown、清单或 Git。

## 上线核验

检查中英文导航、快速开始、图片/视频参考页和 OpenAPI 块。Test it 要确认客户鉴权及浏览器跨域可用；标准规范校验不能代替真实在线调用验收。

空间配置包含常用旧指南路径重定向。原 /zh/docs/...、/en/docs/... 到 GitBook 实际生成路径的前缀变化属于站点重定向，应在网站设置中按真实地址配置。最后绑定文档域名并发布，实际结果以账户配置读回和公开页面核验为准。

官方资料：[Git Sync](https://gitbook.com/docs/docs-as-code/git-sync)、[内容配置](https://gitbook.com/docs/docs-as-code/git-sync/content-configuration)、[OpenAPI](https://gitbook.com/docs/create-content/openapi)、[CI/CD 更新](https://gitbook.com/docs/create-content/openapi/guides/support-for-ci-cd-with-api-blocks)。

## 发布接线记录（2026-10-06）

- 已从文档仓库 master 导入两个语言空间并发布 Basic 网站。中英文首页及全部 8 个图片/视频接口参考页均 HTTP 200；中文首页搜索、语言选择器和分组导航已通过浏览器核验。接口块已渲染鉴权、参数、示例和 Test it。补齐 enum/const 类型后，8 个接口块都没有 undefined 枚举类型；视频状态查询已显示正确的 task_EXAMPLE 示例。未提交真实生成请求，浏览器跨域与付费请求仍需客户调用验收。
- 实现提交 bf53f0f 的 GitHub Actions 校验通过：<https://github.com/dreammis/XINYU_API/actions/runs/37415406729>。
- 原生 Git Sync 尚未配置：当前插件 API 可触发导入，但无法完成 GitHub App 的账户授权绑定；浏览器显示登录页，需要用户完成网页登录后继续配置。单次 API 导入不代表自动 Git Sync 已生效。
- 源工程 vidu2api 的本机插件提交领先于 origin/main，公开导出文件也尚未发布到 main。首次网站可使用经过本地契约校验的 catalog 快照，provenance.json 如实记录本机提交与未提交导出文件；不把这些快照标为远端发布版本。
- 自动源工程导入需先发布真实适配器及公开导出文件，再设置私有源工程读取 / 跨仓库通知所需的 Actions Secrets。当前两个 Secrets 尚未设置。
- 旧 ElevenLabs TTS 文档已保留。源工程返回二进制、旧客户文档记录 JSON 链接，需核对 New API 适配层的实际响应后再导出正式契约。
