# A 的 New API 接入规范入口

这组文件给源工程 A 的 AI 阅读。C 是 G:/workspace/xyapi_doc；B 是运行中的 New API 服务。A 的 AI 在 A 做业务，在 C 的 projects/<源工程ID>/ 做该源工程的接入和文档。

## 先读什么、读完产出什么

| 顺序 | 文件 | 读完要完成的工作 |
| --- | --- | --- |
| 1 | 本文件、C 根目录 AGENTS.md | 识别 A/B/C，确认已有项目目录和正在进行的工作 |
| 2 | research-newapi.md | 核对 B 版本、研究适配方式和未知项，写项目 research/newapi-integration.md |
| 3 | channel-config.md | 写各能力的 newapi/<能力ID>/channel.md，列出实际配置、部署与账单核对 |
| 4 | customer-decisions.md | 从代码、配置、历史决定收集业务条件，只问仍缺的必要决定 |
| 5 | delivery-contract.md | 在项目目录交付上游说明、接入代码/测试、公开契约和验收记录 |
| 按需 | api-execution-modes.md | 同步、异步、流式的交付规则及 TTS 默认协议；不能根据上游行为猜客户协议 |
| 按需 | ../maintenance/model-catalog-contract.md | 分类、模型分组、选型章节和中英文展示 |
| 按需 | ../../newapi/reference/v1.0.0-rc.41/plugin-api/ | 当前线上版本对应的官方插件契约、类型与 schema |
| 按需 | ../maintenance/api-release-sop.md | 客户验收、公开契约导入和部署顺序 |

第一轮研究不需要下载全部工程或阅读 New API 所有模块；按本次能力沿调用链找到入口、渠道、适配和计费依据。它们查不清时，不能直接承诺可接入。

## 每个源工程一个目录

```text
projects/<源工程ID>/
  README.md                         项目入口，C 从这里找到所有资料
  source.json                       A 仓库/路径/源码版本/原文档位置
  upstream/api.md                   A 的真实接口和已知限制，内部说明
  research/newapi-integration.md     接入方式、源码依据、未知项和业务决定
  newapi/<能力ID>/
    channel.md                      该能力的渠道、价格、部署和依赖说明
    plugin.js + plugin.test.mjs      需要任务插件时交付
    adapter/                        确实需要独立适配服务时交付
    public-docs.json                 客户文档文件清单
    public-openapi.json              客户 HTTP 规范
    public-guide.zh.md               中文客户指南
    public-guide.en.md               英文客户指南
  releases/<能力ID>/<版本>.md        客户入口、计费与文档发布证据
```

source.json、upstream、research、channel.md、releases 都是内部维护资料，不列入公开清单。真实密钥与原始敏感证据在 .local/projects/<源工程ID>/；共用管理员密文仍在 .local/newapi/。

源工程 ID 用稳定仓库/项目名称，不用 A1/A2 或渠道数字。公开能力 ID、插件 key、客户路由标识和渠道 ID 分别记录。一个 A 可以有多项能力；多个 A 可以提供同一客户能力，这时保持一个公开契约维护者，其他项目记录引用，避免能力 ID 和公开路由冲突。

## 本次实际项目

本次整理的是 [vidu2api](../../projects/vidu2api/README.md)，A 在 G:/workspace/vidu2api，C 目录为 projects/vidu2api/。它目前有 media-image 和 media-video 两项已集中能力，两者均使用自定义任务插件。其他工程需要按 templates/source-project/ 建立资料，不能因为 G:/workspace 存在工程就自动宣称其渠道或文档已接入。

把本目录入口路径给 A 的 AI，它负责读规范并产出项目资料；不用用户手填配置或接口 JSON。
