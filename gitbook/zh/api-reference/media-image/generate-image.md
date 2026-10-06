# 生成图片

`POST /v1/images/generations`

生成一张图片。耗时请求建议开启 stream；各模型的质量与实际像素限制见图片指南。

[调用指南与限制](../../guides/media-image.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-image.json" path="/v1/images/generations" method="post" %}
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
| `image_url` | string | 否 | — | 单张 HTTP(S) 图片 URL 或图片 Base64 data URL。 |
| `reference_images` | array | 否 | — | 非空参考图 URL / data URL 数组；与单图输入互斥。 |

### 请求示例

```json
{
  "model": "gpt-image-2",
  "prompt": "白色背景上的黄色圆形，简洁插画",
  "resolution": "4k",
  "aspect_ratio": "16:9",
  "stream": true,
  "delivery": "url"
}
```

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
