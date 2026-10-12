# 如何研究 New API，并决定直接渠道、插件还是适配服务

## 先掌握本次环境，不假定最新文档就是线上行为

1. 读 newapi/environment.json，运行 newapi/inspect.ps1 核对 B 的实际版本、身份权限、已安装/启用插件。管理访问令牌与客户业务 Key 是不同用途。
2. 读项目 source.json、upstream/api.md 和 A 实际路由/schema/结果处理，找出本次功能真实输入输出、任务周期、费用事实和部署版本。
3. 在当前 B 盘点本次模型/功能、渠道、插件绑定、分组和计费配置。分页读取，保留脱敏字段。权限失败记录实际状态码与缺少权限，不将 403 当成没有渠道，不擅自提升权限。
4. 官方插件资料已固定在 newapi/reference/v1.0.0-rc.41/，来源提交 2035a82aeb5414253a728bd937d4b8f97aa99b9b；带 hash、原始 URL 和许可证。若 B 版本已变，先取新版本官方资料，保留原版本快照和差异。

C 的 existing media-image/media-video 是可运行例子，不能直接当所有功能的通用插件。官方源仓库是 https://github.com/QuantumNous/new-api 。一般使用说明可查 https://docs.newapi.pro/ ，技术结论以当前运行版本的源码、契约及实测为准。

## 决策依据

| 接入方式 | 何时可选 | 必须验证什么 | 在 C 开发什么 |
| --- | --- | --- | --- |
| 直接使用内置渠道适配器 | B 已有适配器完整支持 A 的真实协议 | 路径、鉴权、输入/响应、stream/任务/下载、用量与结算均匹配 | channel.md、真实契约测试、客户公开文件；不额外写 plugin.js |
| 复用内置任务插件 | 当前插件针对的供应商协议与 A 全流程一致 | 不仅提交成功，查询、终态、产物和计费都正确 | 配置/证据与客户文档；需要改 hook 时已属于自定义插件 |
| 自定义任务插件 | A 与既有协议有差异，可在宿主契约中完成转换 | 原生/公共入口、任务状态、内容读取、费用事实、宿主 URL/路由限制 | plugin.js、hook/公开示例测试、channel.md、客户文档 |
| 独立适配服务 | 需要插件不能做的 I/O、流式桥接、持久队列或定制流程 | B 是否有真实可用入口和计费链路接到该服务，服务本身不会自动继承 B 计费 | adapter/ 服务和部署/测试，必要时配合插件 |
| 扩展 New API 本体 | 现有入口/适配/计费不能表示本次功能 | 对应版本路由、鉴权、用量、结算源码，部署与回归影响 | 记录明确需修改的 B 源码及版本，不能只填渠道宣称接通 |

兼容几个同名字段不是全协议兼容。例：A 收 duration，客户发 seconds；A 返回 data[0].url，宿主下载请求 /content；仅修改 Base URL 或模型名称不会转换它们。

非模型能力的文档清单允许 models: []；当前官方插件 schema 的 meta.models 至少一个。文档清单 models 与插件路由模型含义不同。要接搜索、文件转换等能力，研究路由是否需要模型/功能标识、是否能由确定的原生入口消费。若宿主需要内部路由标识，准确描述其角色，不把它包装成 AI 模型；若必须作为客户字段使用，也必须如实写入规范。没有可验证链路时记录需要扩展的代码，不宣称“任意 HTTP 接口都能直接计费”。

## 插件作者需要理解的最小范围

当前官方契约为单文件、同步 ECMAScript module。插件返回请求描述并解析数据；宿主执行 HTTP、管理客户鉴权、持久化、轮询与结算。不要在同步 hook 中自行发起 fetch、sleep 或后台队列。

| 声明/函数 | 为什么需要 |
| --- | --- |
| meta / protocols / routes | 插件 key 与版本、路由模型、公共协议或插件原生入口；路由冲突必须处理 |
| decodeRequest / native decoder | 读取实际客户 JSON/multipart，校验并转换；不悄悄忽略非法参数 |
| buildSubmitRequest / parseSubmitResponse | 构造 A 请求、解析持久任务 ID或 immediate 完成结果 |
| buildQueryRequest / parseTaskResult | 将 A 的运行/完成/失败状态映射给宿主，确保升级仍能处理在途任务 |
| render / renderEvents / renderFinal | 实际客户响应与 SSE；声明的模式必须真的支持 |
| listArtifacts / buildContentRequest | 产物代理、GET/HEAD/Range/鉴权；不把 A 的私有 URL 交给客户 |
| usageSchema / usageProfiles / extractUsage* | 返回真实计费事实，价格/公式由 B 配置；与预扣和最终结算保持一致 |

官方 v1.d.ts、v1.schema.json 是签名和形状依据。不要只根据本项目现有 extractUsage 返回 null 推断所有能力都按次收费。

## 资料不足时沿源码查，不把研究问题全部丢给用户

固定版本链接基于：
https://github.com/QuantumNous/new-api/tree/2035a82aeb5414253a728bd937d4b8f97aa99b9b

| 不清楚什么 | 查什么 |
| --- | --- |
| 插件参数/host 能力 | docs/plugin-api/v1.md、v1.d.ts、v1.schema.json；pkg/jsplugin/ |
| 已有渠道是否会转换参数 | relay/channel/<适配器>/；从 relay 路由跟实际请求链 |
| 类型与配置字段 | constant/channel.go、model/channel.go、controller/channel*.go |
| 插件上传/启用/调试接口 | router/api-router.go、controller/task_plugin.go、task_plugin_debug.go |
| 客户路由、模型/渠道选择 | router/relay-router.go、middleware/task_plugin*.go、controller/plugin_protocol*.go |
| 某种计费公式是否适用 | usage schema、model/option*、service/ 与实际 task 结算调用链；搜索真实字段的引用 |
| 管理权限为什么失败 | 实际 ACCESS_TOKEN_SCOPE_DENIED 等错误与该版本 authz/路由声明 |
| 前端某设置叫什么/怎么提交 | web/src 对应渠道、价格、任务插件表单，再对照后端接受字段 |

下载完整源码时放 .cache/newapi-research/<版本>/，固定提交，不将整个 B 工程复制进各 A 项目。研究中只输出筛选后的配置/错误，不能输出原始渠道对象、完整请求头或密钥。

先运行实际解码器/转换测试和宿主 dry-run；dry-run 只验证该 hook，不代替客户业务与账单。真实调用按已有授权测试额度，记录证据；响应丢失时先查原任务，再决定重试。

## 研究结果必须保存

在 projects/<源工程ID>/research/newapi-integration.md 写清：
- A/B 版本、研究日期、已读资料及源码文件/固定链接。
- 逐项协议差异与转换位置，选择何种方式、哪些插件/服务需开发。
- 渠道、路由、鉴权、费用事实与价格设置依据。
- 已验证与待验证范围，研究后仍需要用户决定的问题。
- 复现命令、脱敏结果、下一步和责任位置。

改 B 版本或接入方式时更新该文件，而不是让下一位 AI从聊天记录重猜。
