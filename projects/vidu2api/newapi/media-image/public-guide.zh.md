# Image Studio 图片接口

通过服务入口 `https://openai.2yanx.dpdns.org` 使用图片生成与参考图编辑。客户端使用自己的 API Key。当前图片契约为 1.2.0，支持自有图片 URL、Base64 与可选生成进度。

## 分辨率与比例

正方形请求可使用 `size`：

| 档位 | 请求 |
| --- | --- |
| 1K | `"size": "1024x1024"` |
| 2K | `"size": "2048x2048"` |
| 4K | `"size": "4096x4096"` |

也可以独立指定 `resolution` 与 `aspect_ratio`：

```json
{
  "model": "gemini-3.1-flash-image",
  "prompt": "白色背景上的红色圆形，简洁插画",
  "resolution": "2k",
  "aspect_ratio": "16:9",
  "n": 1,
  "response_format": "b64_json",
  "enhance": false
}
```

发送到 `POST /v1/images/generations`，请求头为 `Authorization: Bearer YOUR_API_KEY` 与 `Content-Type: application/json`。

`resolution`、`aspect_ratio`、`reference_images`、`image_url`、`enhance` 是本站扩展参数。它们不是所有 OpenAI 原厂模型通用的官方字段。`size` 使用兼容字段，但本文枚举是本站的支持契约。客户端若将尺寸写成固定下拉框，需要增加这些值或使用自定义 JSON 请求。

档位与比例决定输出目标，实际像素取决于模型。1K 横屏实测为 `1376×768`，不能把档位映射理解为任意像素的精确缩放。各模型档位的实测可用情况由服务方的验收结果确定。

`gemini-3.1-flash-lite-image` 本身只支持 1K，没有 2K/4K；高档位请求在生成提交前返回 HTTP 400。`gemini-3.1-flash-image` 与 `gemini-3-pro-image` 的正方形 4K 已实测为 `4096×4096`。三个 GPT Image 路由及 `image-basic` 的正方形 4K 档实测为 `2880×2880`，不保证 `4096×4096`。`image-basic` 的正方形 1K/2K 实测分别为 `1440×1440` / `1920×1920`。需要精确 4096 正方形图片时，请选择实测达到该尺寸的模型。

三个 GPT Image 路由及 `image-basic` 的 `resolution: "4k"` + `aspect_ratio: "16:9"` 实测为 `3840×2160`。这解释了同一档位在横屏和正方形下的像素差异；选择尺寸时需要同时指定比例。

| 参数 | 接受的值与行为 |
| --- | --- |
| `model` | 下表公开名称之一，必填 |
| `prompt` | 非空，最多 4096 个 Unicode 字符，必填 |
| `size` | 省略、`auto` 或下方尺寸枚举 |
| `resolution` | `1k`、`1080p`、`2k`、`4k`，大小写不敏感；默认 1K |
| `aspect_ratio` | `1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`、`21:9`；默认 1:1 |
| `quality` | 省略、`auto` 或该模型固定的质量值；见下表 |
| `n` | 仅 `1`，默认 `1` |
| `response_format` | `url` 或 `b64_json`；通过本入口省略时返回 URL，需要 Base64 请显式填写 `b64_json` |
| `enhance` | JSON 布尔值 `true` / `false`，默认 `true` |
| `stream` | 省略或 `false` 返回完整 JSON；`true` 返回 SSE 图片完成事件 |
| `progress` | 本站扩展，布尔值，默认 `false`；`true` 必须与 `stream:true` 同用，增加中间阶段事件 |
| `partial_images` | 流式请求可省略或填写 `0`；暂不提供中途预览图 |
| `delivery` | 可填写本站扩展 `url`，仅与 `stream:true` 同用；完成事件只返回自有图片地址，不能同时请求 `b64_json` |
| `reference_images` | 非空 HTTP(S) 图片 URL 或图片 Base64 data URL 数组 |
| `image_url` | 单张参考图 URL 或图片 Base64 data URL；不能与 `reference_images` 同时使用 |

`size` 接受：

- 1K：`1024x1024`、`1536x1024`、`1024x1536`、`1792x1024`、`1024x1792`。
- 2K：`2048x2048`、`2048x1152`、`1152x2048`。
- 4K：`4096x4096`、`4096x2304`、`2304x4096`。

`size` 与显式分辨率、比例冲突时返回 HTTP 400。接口明确拒绝 `mask`、透明背景、`output_format`、`output_compression`、`moderation`、`input_fidelity`、`seed`、`style`、`user`，以及其它未登记字段。质量当前随模型固定，`low`、`medium`、`high` 不支持。

## 模型名称

| 请求模型 | 固定质量 |
| --- | --- |
| `gemini-3.1-flash-lite-image` | `standard` |
| `gemini-3.1-flash-image` | `standard` |
| `gemini-3-pro-image` | `hd` |
| `gpt-image-2.5-fast` | `standard` |
| `gpt-image-2.5-pro` | `hd` |
| `gpt-image-2` | `hd` |
| `image-basic` | `standard` |
| `image-fast` | `standard` |
| `image-pro` | `hd` |
| `image-creative` | `hd` |

这些是服务公开路由名称；名称本身不构成原厂直连或精确模型快照保证。`gpt-image-2.5-fast` / `gpt-image-2.5-pro` 为本站现有产品名，未确认为 OpenAI 官方模型 ID。

## 图片编辑

`POST /v1/images/edits` 接受 JSON 或 multipart。JSON 使用 `image` 字段传单张或多张图片：

```json
{
  "model": "gemini-3-pro-image",
  "prompt": "保留方形构图，将红色改成蓝色",
  "image": ["data:image/png;base64,BASE64_IMAGE"],
  "resolution": "1k",
  "enhance": false
}
```

multipart 使用 `image` 或重复的 `image[]` 文件字段，单个文件最多 20 MiB；其它参数作为普通表单字段，布尔值写 `true` / `false`。编辑需要至少一张参考图，不支持局部遮罩编辑。

## 响应与超时

显式请求 `response_format: "b64_json"` 时成功返回：

```json
{"created": 1790986426, "data": [{"url": "https://s3.yanxinyu.ggff.net/media_outputs/随机文件名.png", "b64_json": "BASE64_IMAGE"}]}
```

解码 `b64_json` 后按实际图片格式读取；返回图片可能是 PNG 或 JPEG。`url` 是服务自有存储地址。请求 `url` 或省略格式时仅返回地址，不附加 Base64。

显式 Base64 请求会先核验原图，再返回 Base64。图片读取失败时返回明确错误；客户端需检查成功结果中的 `b64_json`，流式请求需检查完成事件。

此接口同步等待生成结果。若收到代理 502/504 或连接中断，不能据此断定任务免费或未执行，也不要自动重发；需先通过消费记录与服务方核对。具体超时验收情况见本次测试报告。

## 流式生图

生成与编辑接口都支持 `stream:true`。等待过程中连接会持续收到心跳，完成后返回 `image_generation.completed` 或 `image_edit.completed` 事件。心跳不是预览图；`partial_images` 仅支持 `0`。

需要展示生成进度时，加上本站扩展 `progress:true`。生成会增加 `image_generation.progress`，编辑会增加 `image_edit.progress`。JSON 和 multipart 均支持；表单布尔值填写 `true`。未开启进度的调用仍只收到心跳和最终事件。

```bash
curl -N https://openai.2yanx.dpdns.org/v1/images/generations \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-image-2","prompt":"白色背景上的黄色圆形","resolution":"4k","aspect_ratio":"16:9","stream":true,"progress":true,"delivery":"url"}'
```

```text
event: image_generation.progress
data: {"type":"image_generation.progress","stage":"generating","percent":null,"percent_source":null,"request_id":"REQUEST_ID"}
```

`percent` 只有在源状态明确提供数值时才为 0–100 的数字，且 `percent_source` 为 `upstream`；否则两者均为 `null`。这里表示源生成阶段报告的百分比，并非整个图片下载、上传和交付过程的完成率，也不保证每个模型都会提供数值。服务不估算进度、不生成预览图。

| `stage` | 含义 |
| --- | --- |
| `queued` | 请求已接收或生成排队 |
| `preparing` | 准备生成，包括参考图准备 |
| `generating` | 图片生成中 |
| `fetching` | 生成完成，正在读取原图 |
| `uploading` | 正在写入服务自有图片存储 |
| `delivering` | 正在准备最终图片响应 |
| `unavailable` | 暂时无法读取进度；原生成继续，心跳继续 |
| `failed` | 原生成任务失败；仍需检查随后最终错误事件 |

进度约每秒读取一次，只发送变化；短暂阶段可能不会出现在客户端，不能依赖固定阶段顺序。开启进度时，所有进度、完成和错误事件使用同一 `request_id`。`delivering` 或生成阶段的 `100` 均不代表成功交付，必须等最终完成事件。读取进度失败不会重新提交图片或重复计费。

此进度事件是本站扩展。使用 OpenAI SDK 时，在 `extra_body` 中加入 `"progress": True`，并按 `event.type` 显式处理；客户端界面不会自动展示自定义事件。需要原厂类型严格兼容的客户端可以保持默认关闭。URL 与 Base64 两种最终交付均能开启进度。

部分 SDK 版本会把自定义事件装入已有图片事件类，但仍保留 `type`、`stage`、`percent` 等字段；请判断 `event.type`，不要仅依赖 Python 类名或 `isinstance`。

默认流式完成事件包含 `b64_json` 原图、实际 `size`、`output_format`、时间戳，并附加自有存储 `url` 和用于查单的 `request_id`。仅填写 `response_format:"url"` 时仍保持这个 Base64 事件，保证现有客户端解析方式。

需要降低传输量时，加上本站扩展 `delivery:"url"`：等待期间仍有心跳，完成时返回自定义 `image_url.completed` 事件。图片不内嵌在接口响应中，客户端从自有存储地址下载。此事件需要客户端按下面的结构处理，不能把它当作标准 Base64 完成事件。

```json
{"model":"gpt-image-2","prompt":"白色背景上的黄色圆形","resolution":"4k","aspect_ratio":"16:9","stream":true,"delivery":"url"}
```

```text
event: image_url.completed
data: {"type":"image_url.completed","operation":"generate","created_at":1791300000,"url":"https://s3.yanxinyu.ggff.net/media_outputs/随机文件名.png","request_id":"REQUEST_ID"}

data: [DONE]
```

`operation` 在编辑时为 `edit`。此事件不声明未经读取的图片尺寸；下载后读取实际像素。普通 JSON 只返回 URL 时使用 `stream:false`，省略 `response_format` 或填写 `url`。

OpenAI Python SDK 的普通流式解析可直接使用：

```python
import base64
from pathlib import Path
from openai import OpenAI

client = OpenAI(
    base_url="https://openai.2yanx.dpdns.org/v1",
    api_key="YOUR_API_KEY",
    max_retries=0,
)
events = client.images.generate(
    model="gpt-image-2",
    prompt="白色背景上的黄色圆形，简洁插画，无文字",
    stream=True,
    partial_images=0,
    extra_body={"resolution": "4k", "aspect_ratio": "16:9", "enhance": False},
)
for event in events:
    if event.type == "image_generation.completed":
        Path("result." + event.output_format).write_bytes(base64.b64decode(event.b64_json))
        print(event.size, event.request_id)
```

编辑使用同样的 `stream=True`，通过 `client.images.edit(image=..., ...)` 提交参考图；JSON 编辑也支持相同参数。最终事件类型为 `image_edit.completed`。

服务按张计费，不提供原厂 token 使用量，完成事件省略 `usage`；严格要求原厂 token 使用量字段的客户端需要兼容该字段缺失。`quality:"auto"` 表示完成事件不声明未经确认的原厂质量档位，实际质量仍由请求模型的固定档位决定。

流式连接开始后，失败通过 `error` 事件报告，HTTP 200 本身不表示已经生图成功。客户端必须收到完成事件并解码图片才能确认成功。断开连接不会取消已经提交的生成，也不要自动重新提交；可以用 `X-Image-Request-Id` 或完成事件的 `request_id` 向服务方查单。

入口同时接受 20 条图片请求，超过容量的请求返回 HTTP 429 且不提交生成。排队和交付也占用入口容量；它不等于 20 张图片同时生成。流式等待期间有心跳。未开启流式的请求返回普通 JSON，长时间等待仍可能触发代理的同步等待限制。
