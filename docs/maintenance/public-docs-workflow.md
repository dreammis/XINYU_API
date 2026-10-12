# 接入与文档发布工作流

完整步骤先读 [START_HERE](../../START_HERE.md)、[A 的接入规范](../integration/README.md) 和 [接口发布 SOP](api-release-sop.md)。C 的资料入口是 [源工程索引](../../projects/README.md)。

## 唯一维护位置

A 是功能源工程，B 是运行的 New API 服务，C 是本仓库 G:/workspace/xyapi_doc。默认由 A 的 AI 在 C 编写接入代码和公开客户契约；C 维护统一规则、生成器与站点发布。

图片与视频已迁入 projects/vidu2api/newapi/media-image、projects/vidu2api/newapi/media-video。客户契约与插件旁的测试一起维护，A 旧文件是迁入前副本，不再用于导入。A 业务 API、队列和仍在 A 的配套服务继续由其真实运行代码负责，位置见 newapi/README.md。

公开契约描述客户经过 B 实际看到的协议，包括参数转换、鉴权、结果、错误、异步/流式流程和计费。不能用 A 内部协议替代客户协议。非模型能力同样登记，models 可以为空。

## C 内首次接入

1. 在 projects/<源工程ID>/newapi/<能力ID>/ 实现插件或实际适配方式、测试与四个公开文件；公开清单使用 templates/public-docs.json。
2. sources.json 增加唯一 ID，登记 C 自身：dreammis/XINYU_API、master、localDirectory "." 和清单路径。保留分类、模型分组与选型章节规则，见 model-catalog-contract.md。
3. 用真实适配逻辑核对示例，部署/启用到 B 后验收客户入口与账单，在 projects/<源工程ID>/releases/<能力ID>/<版本>.md 保存脱敏交付记录。
4. 运行 npm test、npm run docs:sync、npm run build、npm run docs:check，核对页面和调试。
5. 验收后发布本次 C 文件并确认 Cloudflare 实际部署结果，回填 B 运行版本与 C 文档版本。

后续直接修改 C 同一能力的接入和公开契约，再导入、检查、发布。不需要为每个 A 配置来源通知，不需要到文档工程重填接口参数。

## 快照与生成结果

| 位置 | 是否人工维护 | 内容 |
| --- | --- | --- |
| projects/<源工程ID>/ | 是 | 身份、上游说明、接入研究、newapi/<能力ID>/ 实现/配置/客户文件与验收记录 |
| content/zh、content/en | 是 | 共用指南与 FAQ |
| sources.json | 是 | 能力清单登记、模型展示指针 |
| catalog/<ID>/ | 否，由 docs:sync 导入 | 带来源提交、未提交标记和内容哈希的公开快照 |
| gitbook/ | 否，由生成器导出 | 可移植 Markdown / OpenAPI |
| site/zh、site/en 与公开数据文件 | 否，由生成器输出 | 站点页面、模型目录、调试允许列表 |

build 只使用已导入快照。公开契约改动后必须先 docs:sync；手改快照会触发哈希错误，手改 Markdown 导出会触发生成差异。缺文件、坏链接和错误哈希明确失败。

本机导入记录 C 的 HEAD 和 workingTreeChanges，未提交文件不能伪装成已发布版本。生产发布保持接入源码、原始契约、登记和快照同批一致。当前 docs:check 检查生成一致性与 OpenAPI，npm test 包括真实插件和公开示例测试，CI 还编译 Pages Function。

## 外部仓库例外

确需从外部接入仓库维护公开契约时，sources.json 指向那个唯一维护仓库，避免再抄一份客户指南。docs:sync:remote 固定登记 ref 的远端提交再读取文件；一次读取全部来源，缺文件或权限失败不会静默跳过。

外部仓库按 templates/source-docs-sync.yml 在客户入口部署验收后通知 C；私有读取用 DOCS_SOURCE_TOKEN，跨仓库通知用 DOCS_DISPATCH_TOKEN，两者不同。集中到 C 的能力不需要这段跨仓库通知接线。

C 的 Import released public contracts workflow 保留为远端导入工具，不是当前集中协作必须经过的步骤。新迁入文件先实际发布到 C 远端，远端导入才可读取，不在迁入前声称它已成功。

## 多渠道、发布与回退

相同路径、输入输出和计费语义的多个渠道复用一个能力契约，内部路由记录 A 的来源。客户行为或流程有差异时明确描述，无法共用时使用独立能力 ID；每项能力独立规范，避免共同使用 /v1/responses 时互相覆盖。

源码合并、B 接入启用、客户验收、C 网站发布各有实际证据。公开发布的契约必须对应已验收运行行为；价格说明同步当前公开配置。回退确认实际运行版本后恢复契约，再导入和发布。下线先安排客户入口退役，移除登记和共用链接后由生成器清理页面。

共用管理密文在 .local/newapi，各源工程的秘密/原始证据在 .local/projects/<源工程ID>/ 或已有私有运行配置。公开清单仅列公开文件，项目内部资料不会自动导入。Pages /api-proxy 使用客户 Key，不能接入管理员令牌。网站自动部署与域名记录见 cloudflare-setup.md；GitBook 历史记录见 gitbook-setup.md。
