# 渠道、路由和计费需要配置什么

本文件给 A 的接入作者。具体结果存 projects/<源工程ID>/newapi/<能力ID>/channel.md，不把全局配置表复制给客户。字段依据当前版本 constant/channel.go、model/channel.go 和插件契约；未知字段沿对应 controller/前端表单研究。

## 最少要核对的项目

| 设置/事实 | 要解决的问题 | 记录方式 |
| --- | --- | --- |
| 渠道 ID、name、type、status | 哪条渠道真实服务本次能力、如何启用 | 已有 ID 先查；直接内置适配器用其真实类型，当前 Task Plugin 类型 61 |
| base_url | B 实际请求哪个 A 地址，路径如何拼接 | 可从 B 访问的业务服务地址；检查不会把请求送回 B 自己形成环路 |
| key 与认证头 | B 调 A 用什么上游凭证 | 只记录认证方式和安全存储位置；渠道密钥保存 B/本机秘密，不写文档值 |
| models / 功能路由标识 | B 用什么标识选择这条渠道 | 列已验证客户名称及内部功能标识角色，非模型功能按研究结果配置 |
| model_mapping / 插件内映射 | 客户名如何对应 A 内部名 | 选一个明确执行位置，防止重复映射或内部名泄露 |
| group | 哪些客户/测试 Key 能访问 | 同时核对渠道分组、用户与 Key 限制；default 是本次实例，不是所有项目默认决定 |
| priority、weight | 多渠道时如何选择 | 对照当前路由算法与现有业务决定；不凭数字猜同优先级/失败切换行为 |
| setting.task_plugin_key | 任务渠道运行哪个插件 | type 61 的当前实例已验证；插件存在、enabled/active、协议/模型匹配 |
| param_override、header_override | 是否真实应用于此调用链 | 查对应 relay；仅字段存在不能证明任务插件分支会消费它 |
| 并发、超时、重试、自动禁用 | 慢任务和渠道异常如何影响客户 | 核对 B、A、入口代理三段；未知结果先查任务，禁止盲目重复生成 |
| TestModel / 测试方式 | 渠道测试到底验证了什么 | 使用代表性请求；后台快速测试不能覆盖全部参数或长任务 |
| 模型端点/说明/可见性 | 客户能否找到真实可用入口 | 描述与实际路由同步；模型说明或 endpoints JSON 不会注册 API |
| 计费配置 | 收费按什么单位与事实计算 | 见下节；模型管理展示与实际结算单独验证 |
| 公开地址/产物域名 | 返回的内容能否安全下载 | TaskPublicAddress 等宿主实际设置、产物读取/Range/HEAD、代理无内部密钥 |

不要把既有渠道整个对象拷贝回 PUT：它可能含 key、并发任务或其他任务改动。读取当前配置，构造可审阅的本次差异，只合并本次字段。共享选项是整份 JSON 时也先读再合并，提交前核对没有并发改动。没有变更接口的版本不应虚构 PATCH。

## 插件与渠道不是二选一

使用插件时仍需配置渠道：上传插件 → 确认运行状态/哈希 → 设置上游地址与凭证 → 绑定插件 → 设置路由模型/分组 → 配置价格 → 客户入口和账单验收。

已核对的管理入口包括：
- GET /api/plugin/task 和 /api/plugin/task/runtime/status：清单/运行状态。
- GET /api/plugin/task/:key：该版本源码定义的详情；列表的 source 是来源层标签。
- POST /api/plugin/task：上传；/:key/activate、/:key/status、/:key/dryrun 等请求体需查对应版本 controller，不猜字段。
- 渠道读写以当前 router/controller 为准；读取 /api/channel/ 时分页、筛字段，禁止打印密钥。
- 模型价格接口以 B 当前版本为准；旧工具用 PUT /api/option/ 的 ModelPrice，本版本也定义 model_pricing 管理路由。先确定当前实际模式，不能同时修改两套以期“兜底”。

## 计费要形成明确业务约定

确定单位（次/张/成功任务/秒/字符/token/credit 等）、币种、单价与分组倍率、预扣与结算时间、失败/取消/部分成功的处理。模型价格、插件费用公式和 usage facts 必须匹配。

当前官方契约支持 plugin_billing_expr 按 <pluginKey>::<model> 定位表达式；核对实际配置优先级和对应模型用量。固定 ModelPrice 是现有视频实例使用的方式，不是任意功能的默认收费方式。图片插件有 image_count/resolution 事实与 Lite 专用 usageProfiles，不能直接照视频插件 null 用量复制。

用实际账单核对一次成功请求，记录失败或取消的真实退款，不只计算公式。HTTP 200 也可能是任务提交或业务失败，不能当成功扣费依据。单位和触发时机可以写客户指南，未核验当前售价时不写固定数字。

## 接入记录与回退

channel.md 保存模式、ID、绑定、字段来源、密钥位置、配套服务、价格/分组、部署命令依据、检查命令和回退范围。回退先考虑在途任务和旧版本解析兼容性，保留其他项目价格和渠道；文档回退不能代替 B 运行回退。

本次实际 vidu2api 的配置在 projects/vidu2api/newapi/media-image/channel.md 和 media-video/channel.md；其中的 ID/权重/地址是实例证据，其他 A 不能机械照抄。
