# vidu2api 上游接口与客户协议差异

本文件给接入与文档维护者阅读，不进入客户站。核对日期 2026-10-10；A 工作区版本与原文件哈希见 ../source.json。下面的响应示意来自当前代码/已存契约，不是本次新发的生成请求。A 本机源码版本不等于今天已核验的生产业务镜像。

## 原始文档与实现在哪里

| 内容 | A 原文件 | 代码依据 |
| --- | --- | --- |
| 网关总体、图片/视频/语音 | G:/workspace/vidu2api/docs/gateway_api_reference.md | gateway/app.py、gateway/schemas.py |
| 图片字段与模型 | G:/workspace/vidu2api/docs/image_generation_api_reference.md | gateway/image_generation.py、shared/image_models.py |
| 视频业务字段 | G:/workspace/vidu2api/docs/video_api_reference.md | gateway/video_generation.py、gateway/app.py |
| 原 New API 视频研究 | G:/workspace/vidu2api/docs/newapi_video_integration_research.md | 当前 tag 官方插件契约与既有适配器 |
| 原图片接入研究 | G:/workspace/vidu2api/docs/newapi_image_channel_plan.md | 当前图片插件与 stream-proxy |

旧文档有“完全兼容”、固定 Base64 响应和主要描述同步视频等历史说法，不能逐字搬进客户规范。当前真实 A 路由、结果处理与 C 插件共同决定客户行为，公开版本以对应 public-openapi.json 和指南为准。

## A 的实际内部调用

| 方法/路径 | 代码中行为 | 客户经过 B 时的差异 |
| --- | --- | --- |
| GET /v1/models | A 返回自身模型清单，需要网关凭证 | 客户公开名称与 B 路由/清单核对，不公开内部编号 |
| POST /v1/images/generations | A 提交图片，同步返回 created/data；请求 schema 支持 url/b64_json | 插件固定只向 A 请求自有 URL；B/图片入口处理客户 Base64 或 SSE |
| POST /v1/videos/generations | A 同步等待视频完成，返回结果 URL | 当前客户主流程使用异步/stream，不能把内部同步耗时当稳定客户入口 |
| POST /v1/videos（/v1/video/generations 别名） | A 创建持久任务，立即返回 id/task_id/status=processing | 插件保留上游任务 ID于内部，宿主给客户自己的任务 ID |
| GET /v1/videos/{video_id} | A 查询任务，完成后的 data[0].url 指向产物 | 插件投影公共状态；客户通过 B 的 /content 读取视频 |
| GET /internal/images/{observation_id}/progress | A 用独立只读凭证查询生成进度 | 不公开；图片入口将进度投影为中性 SSE，不能重新提交生成 |
| POST /v1/audio/speech、GET /v1/audio/voices | A 现有语音路由 | 本次未建立其 B 公开验收契约，不纳入这两个插件 |

A 的网关鉴权在 app.py 的 ensure_key，可接 Bearer 或 X-API-Key；B 客户使用自己的 Bearer Key。上游网关凭证在 B 渠道/实际运行秘密中，本文不记录值。B 当前渠道地址见各 channel.md。

## 最小上游请求示意

图片（插件实际出站会映射为 A 的内部模型）：

```http
POST <A_BASE_URL>/v1/images/generations
Authorization: Bearer <UPSTREAM_GATEWAY_KEY>
Content-Type: application/json
```

```json
{"model":"3.2_fast_m","prompt":"白色背景上的红色圆形","resolution":"1080p","aspect_ratio":"1:1","n":1,"response_format":"url"}
```

视频：

```json
{"model":"video-fast","prompt":"A tram moving through a rainy street","duration":5,"resolution":"1080p","aspect_ratio":"16:9","sample_count":1}
```

发 POST /v1/videos 得到任务 ID 后，用同一网关身份 GET /v1/videos/{id}。这些是内部请求示意；客户示例直接读 ../newapi/media-image/public-guide.zh.md 与 ../newapi/media-video/public-guide.zh.md，不使用这里的内部名称。

## 为什么需要适配

- 图片客户公开名称经插件内 UPSTREAM_MODELS 转换，渠道不再加第二层 model_mapping。
- 图片 A schema 允许 n=1..4，但现有实际产物路径只交付一张，公开插件明确限制 n=1，不承诺多张。
- A 的 size、aspect_ratio 等兼容/默认处理不能当客户规范；C 插件先校验显式尺寸、档位和比例冲突，并拒绝不支持参数。
- A 的直接生图路由没有本次完整客户编辑/multipart 入口；插件负责解码并统一成参考图请求。
- 图片 stream/delivery/progress 是客户入口配套服务的行为，不是插件 normalizeImageRequest 支持 stream:true；入口改成内部非流式并只转发一次。
- 视频客户 seconds/size/input_reference 转为 A duration/resolution/aspect_ratio/image_url；多参考图保持顺序和数量。
- A 路由没有客户 /v1/videos/{id}/content；插件从内部 data[0].url 定位媒体，B 代理 GET/HEAD/Range。
- 客户状态、错误、模型与 URL要投影，不把内部 A 任务快照原样返回。
- 短视频与普通模型能力边界不同，以同版本公开指南模型表和插件 normalizeVideoRequest 为准，不再另抄一份限制表。

## 错误、长任务与已知边界

A 对非法输入、无效凭证、查不到任务、队列满、上游失败有实际错误分支；本机代码可见图片/视频队列满为 503、Retry-After:30，任务不存在为 404。FastAPI schema 校验与插件客户校验不是同一层，客户具体状态/错误以 B 公开规范和客户验收为准。

异步任务完成/失败状态由 A 持久数据投影为 completed/failed；短暂响应中断不证明未生成或未计费。当前入口/宿主/队列没有在本次重新做幂等重试验收，不宣称通用幂等保证或自动取消。

图片进度只观察原任务。视频资产服务配合 A 内部队列，完成产物必须符合实际交付流程；普通视频后处理和 short 的原始产物处理不相同。源码位置与部署边界见各 channel.md。

历史业务验收见 A 的 docs/newapi_image_channel_results/2026-10-03/ 和 docs/newapi_video_results/2026-10-03/README.md。本次只核对源码/已有渠道，不重新生成或验证当前生产的全部模型、售价和退款。新版本要把实际客户与账单证据写进本项目 releases。

## TTS 异步接入（2026-10-11）

A 新增鉴权 POST /internal/tts/tasks、GET /internal/tts/tasks/{id} 及 GET/HEAD /internal/tts/tasks/{id}/content，持久化任务并恢复原账号/remoteID。5000加权字符（汉字计2），MP3，参数和等价长度预检依据见 [TTS 渠道](../newapi/media-tts/channel.md)。公开协议由media-tts单独维护，客户调用vox-1，真实部署和账单见releases/media-tts/1.0.0.md。
