# Generate an image

`POST /v1/images/generations`

Generate one image. Prefer stream=true for long requests. See the image guide for model-specific quality and pixel limits.

[Guide and limits](../../guides/media-image.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-image.json?version=279c9438570f1271" path="/v1/images/generations" method="post" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-image.json?version=279c9438570f1271
{% endopenapi %}

## application/json

| Name | Type | Required | Default / values | Description |
| --- | --- | --- | --- | --- |
| `model` | string | yes | gemini-3.1-flash-lite-image, gemini-3.1-flash-image, gemini-3-pro-image, gpt-image-2.5-fast, gpt-image-2.5-pro, gpt-image-2, image-basic, image-fast, image-pro, image-creative | Public product route. Lite accepts 1K only. |
| `prompt` | string | yes | — | Non-blank prompt, at most 4096 Unicode characters. |
| `size` | string | no | auto, 1024x1024, 1536x1024, 1024x1536, 1792x1024, 1024x1792, 2048x2048, 2048x1152, 1152x2048, 4096x4096, 4096x2304, 2304x4096 | Target tier and aspect ratio; actual output pixels depend on the model. Must agree with resolution/aspect_ratio. |
| `resolution` | string | no | "1k" | Case-insensitive tier; Lite only accepts 1k/1080p. |
| `aspect_ratio` | string | no | 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9 |  |
| `quality` | string | no | auto, standard, hd | Fixed per model; standard for Lite/Flash/2.5-fast/basic/fast, hd for Pro/2.5-pro/2/pro/creative. auto accepts the fixed tier. |
| `n` | integer | no | 1 |  |
| `response_format` | string | no | url, b64_json | Non-streaming response defaults to URL. Default SSE still embeds Base64, even when url is requested. |
| `enhance` | boolean | no | true |  |
| `stream` | boolean | no | false | Use true for SSE heartbeats followed by a completion event. No partial previews. |
| `partial_images` | integer | no | 0 |  |
| `delivery` | string | no | "url" | Site extension: stream=true only, incompatible with response_format=b64_json. Emits image_url.completed. |
| `image_url` | string | no | — | HTTP(S) image URL or Base64 image data URL. |
| `reference_images` | array | no | — |  |

### Example request

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

## Responses

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
