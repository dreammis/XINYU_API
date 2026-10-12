# vidu2api 图片渠道与依赖

这是内部接入说明，不加入 public-docs.json。2026-10-10 对 B 做只读渠道核对；不是新的生成或价格验收。

| 项目 | 当前读取结果/依据 |
| --- | --- |
| B | https://openai.2yanx.dpdns.org，v1.0.0-rc.41 |
| 渠道 | ID22，image-studio，type61，status1 |
| A base_url | https://vidu2api.cgssoccer.com |
| setting.task_plugin_key | media-image |
| 插件 | 1.2.0，已启用/active，源码哈希与本目录 plugin.js 一致 |
| group / priority / weight | default / 100 / 0，本实例值，其他 A 不机械照抄 |
| models | 本目录 public-docs.json 的10个公开图片调用名，已与读取列表核对 |
| model_mapping | 无；内部编号映射在 plugin.js 的 UPSTREAM_MODELS |
| param_override / header_override | 无 |
| 上游凭证 | 已在 B 渠道配置；本次不提取/输出密钥值 |
| 管理凭证 | C .local/newapi/admin.credential.xml，通过 newapi/load-session.ps1 加载 |
| 客户身份 | 客户自己的 Bearer Key，与管理和上游身份分开 |

只读原始记录位置 C .local/newapi/vidu2api-channels.json；已按字段选取，不保存渠道 key。

## 计费与公开行为

插件 extractUsage* 返回 image_count/resolution，usageSchema/usageProfiles 体现按图与档位事实；Lite profile 仅1K。价格和公式由 B 配置，本次未读写当前售价或重跑账单，不能照视频固定价格推断图片价格。

客户参数、模型限制、尺寸实测差异、编辑、stream/delivery/progress 只维护本目录的 public-openapi.json 和双语指南，channel.md 不再抄另一份客户限制表。

## 配套图片入口：源码仍在 A，部署在 B 的入口侧

源码：G:/workspace/vidu2api/integrations/newapi/media-image/stream-proxy/。
其 README 明确说明服务安装在 New API 服务器，监听 loopback 18321，一次转发到 loopback New API 3000。它处理 SSE、文件/图片交付、容量与进度观察，不选渠道或拥有计费。

因此 plugin.js 单元测试不能覆盖 stream:true/delivery/progress 整条链路；插件接到的内部请求为 stream:false,response_format:url。进度另调 A 内部只读接口，凭证在运行环境的 .progress.env，不能进入客户文档/Git。

容量、Nginx配置、超时、测试与回退按 A 该目录 README和实际服务器配置核对；本次没有迁入服务源码或重新部署。图片隐私工具仍在 A 的 integrations/newapi/media-image/privacy_check.py。

## 后续变更与验证

先读 C docs/integration/channel-config.md，核对 B 当前渠道/价格/插件哈希和入口服务部署。修改插件后在根 npm test；修改入口要跑对应 Python 测试，再按已有授权部署和客户验收。提交前核对模型清单、分组、预扣/结算，不能因代码转换通过就写成全入口成功。

历史验收：A docs/newapi_image_channel_results/2026-10-03/README.md、image-url-final-report.md 及后续进度/容量记录。当前价格/生成成功/退款若需要承诺，重新核对实际证据并写入 projects/vidu2api/releases/media-image/<版本>.md。
