# 编辑图片

`POST /v1/images/edits`

基于参考图编辑，不支持遮罩。JSON 使用 image；multipart 使用 image 或重复 image[] 文件字段，单文件最多 20 MiB。

[调用指南与限制](../../guides/media-image.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-image.json" path="/v1/images/edits" method="post" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-image.json
{% endopenapi %}

## application/json

| 参数 | 类型 | 必填 | 默认值 / 可选值 | 说明 |
| --- | --- | --- | --- | --- |
| `model` | string | 是 | gemini-3.1-flash-lite-image, gemini-3.1-flash-image, gemini-3-pro-image, gpt-image-2.5-fast, gpt-image-2.5-pro, gpt-image-2, image-basic, image-fast, image-pro, image-creative | 本站公开调用名称，具体能力与限制见指南。 |
| `prompt` | string | 是 | — | 必填，不能为空白，最多 4096 个 Unicode 字符。 |
| `size` | string | 否 | auto, 1024x1024, 1536x1024, 1024x1536, 1792x1024, 1024x1792, 2048x2048, 2048x1152, 1152x2048, 4096x4096, 4096x2304, 2304x4096 | 分辨率档位与比例预设，实际像素以返回文件为准；必须与 resolution/aspect_ratio 一致。 |
| `resolution` | string | 否 | "1k" | 分辨率档位大小写不敏感，默认 1K，Lite 仅支持 1K。 |
| `aspect_ratio` | string | 否 | 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9 | 画面比例；图片默认 1:1，普通视频默认 16:9，short 固定 9:16。 |
| `quality` | string | 否 | auto, standard, hd | 质量随模型固定，只接受 auto 或该模型的 standard/hd，不支持 low/medium/high。 |
| `n` | integer | 否 | 1 | 每次仅生成一个产物。 |
| `response_format` | string | 否 | url, b64_json | 普通 JSON 默认只返回 URL；默认 SSE 即使填写 url 也仍包含 Base64。 |
| `enhance` | boolean | 否 | true | 提示词增强开关，默认 true。 |
| `stream` | boolean | 否 | false | true 返回等待心跳和最终图片事件。 |
| `partial_images` | integer | 否 | 0 | 仅接受 0，暂不提供中途预览图。 |
| `delivery` | string | 否 | "url" | 本站 URL 交付扩展，仅与 stream:true 同用，不能同时请求 b64_json；完成事件为 image_url.completed。 |
| `image` | string / array | 是 | — | 参考图片，JSON 使用 URL / data URL 或其数组；multipart 使用文件。 |

### 请求示例

```json
{
  "model": "gemini-3-pro-image",
  "prompt": "保持构图，将红色改为蓝色",
  "image": "https://example.com/reference.png",
  "stream": true,
  "partial_images": 0
}
```

## multipart/form-data

Boolean form fields use true/false; n and partial_images are integer strings.

| 参数 | 类型 | 必填 | 默认值 / 可选值 | 说明 |
| --- | --- | --- | --- | --- |
| `model` | string | 是 | gemini-3.1-flash-lite-image, gemini-3.1-flash-image, gemini-3-pro-image, gpt-image-2.5-fast, gpt-image-2.5-pro, gpt-image-2, image-basic, image-fast, image-pro, image-creative | Public product route. Lite accepts 1K only. |
| `prompt` | string | 是 | — | Non-blank prompt, at most 4096 Unicode characters. |
| `size` | string | 否 | auto, 1024x1024, 1536x1024, 1024x1536, 1792x1024, 1024x1792, 2048x2048, 2048x1152, 1152x2048, 4096x4096, 4096x2304, 2304x4096 | Target tier and aspect ratio; actual output pixels depend on the model. Must agree with resolution/aspect_ratio. |
| `resolution` | string | 否 | "1k" | Case-insensitive tier; Lite only accepts 1k/1080p. |
| `aspect_ratio` | string | 否 | 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9 |  |
| `quality` | string | 否 | auto, standard, hd | Fixed per model; standard for Lite/Flash/2.5-fast/basic/fast, hd for Pro/2.5-pro/2/pro/creative. auto accepts the fixed tier. |
| `n` | integer | 否 | 1 |  |
| `response_format` | string | 否 | url, b64_json | Non-streaming response defaults to URL. Default SSE still embeds Base64, even when url is requested. |
| `enhance` | boolean | 否 | true |  |
| `stream` | boolean | 否 | false | Use true for SSE heartbeats followed by a completion event. No partial previews. |
| `partial_images` | integer | 否 | 0 |  |
| `delivery` | string | 否 | "url" | Site extension: stream=true only, incompatible with response_format=b64_json. Emits image_url.completed. |
| `image` | string | 否 | — | One reference file. For multiple files use repeated image[]. At most 20 MiB per file. |
| `image[]` | array | 否 | — |  |

## 响应

| Status | Description |
| --- | --- |
| 200 | JSON result, or SSE comment heartbeats then a completion/error event. HTTP 200 alone is not proof of generation success. |
| 400 | Unsupported or conflicting parameters. |
| 401 | Missing or invalid customer API Key. |
| 413 | Request exceeds upload limits. |
| 429 | Capacity or rate limit exceeded. |
| 502 | Generation or image delivery failed; do not automatically resubmit. |
| 507 | Insufficient capacity before submission. |

### application/json

```json
{
  "created": 1790980000,
  "data": [
    {
      "url": "https://s3.yanxinyu.ggff.net/media_outputs/0123456789abcdef0123456789abcdef.png"
    }
  ]
}
```

### text/event-stream

```text
event: image_url.completed
data: {"type":"image_url.completed","operation":"generate","url":"https://s3.yanxinyu.ggff.net/media_outputs/0123456789abcdef0123456789abcdef.png","request_id":"REQUEST_ID","created_at":1790980000}

data: [DONE]


```
