# 创建视频任务

`POST /v1/videos`

创建一个异步视频任务，按条计费，失败退款。保存任务 ID；客户端超时后先检查原任务，避免重复生成。

[调用指南与限制](../../guides/media-video.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json?version=9ea567a7401837be" path="/v1/videos" method="post" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json?version=9ea567a7401837be
{% endopenapi %}

## application/json

Conflicting aliases/metadata are rejected. Single-image and reference-image inputs are mutually exclusive. For reference mode use fast/pro and 3–10 seconds.

| 参数 | 类型 | 必填 | 默认值 / 可选值 | 说明 |
| --- | --- | --- | --- | --- |
| `model` | string | 是 | cogvideo-fast, cogvideo-pro, cogvideo-basic, cogvideo-short | 本站公开调用名称，具体能力与限制见指南。 |
| `prompt` | string | 是 | — | 必填，不能为空白，最多 4096 个 Unicode 字符。 |
| `seconds` | integer / string | 否 | — | 整数或整数字符串。fast/pro/basic 默认 5 秒，short 固定 8 秒；basic 最多 5 秒，参考生视频至少 3 秒。 |
| `duration` | integer / string | 否 | — | seconds 的兼容名称，两种写法同时出现时必须一致。 |
| `size` | string | 否 | 1920x1080, 1080x1920, 1080x1080, 1440x1080, 1080x1440, 720x1280 | fast/pro/basic 仅接受 1080p 尺寸，short 仅接受 720x1280；具体枚举见指南。 |
| `resolution` | string | 否 | 1080p, 720p | fast/pro/basic 为 1080p，short 为 720p。 |
| `aspect_ratio` | string | 否 | 16:9, 9:16, 1:1, 4:3, 3:4 | 画面比例；图片默认 1:1，普通视频默认 16:9，short 固定 9:16。 |
| `input_reference` | string | 否 | — | 单张参考图片 URL / data URL；multipart 使用一个文件，最多 20 MiB。 |
| `image_url` | string | 否 | — | 单张 HTTP(S) 图片 URL 或图片 Base64 data URL。 |
| `reference_images` | array | 否 | — | 非空参考图 URL / data URL 数组；与单图输入互斥。 |
| `generation_mode` | string | 否 | speed, pro, pro_ad | 仅参考生视频使用，默认 pro_ad。 |
| `metadata` | object | 否 | — | 视频扩展参数对象；multipart 表单使用 JSON 编码字符串。 |
| `n` | integer | 否 | 1 | 每次仅生成一个产物。 |
| `sample_count` | integer | 否 | 1 | 仅接受 1，不支持多产物。 |

### 请求示例

```json
{
  "model": "cogvideo-fast",
  "prompt": "红色纸船在平静的池塘上缓缓漂浮",
  "seconds": "5",
  "size": "1920x1080"
}
```

## multipart/form-data

| 参数 | 类型 | 必填 | 默认值 / 可选值 | 说明 |
| --- | --- | --- | --- | --- |
| `model` | string | 是 | cogvideo-fast, cogvideo-pro, cogvideo-basic, cogvideo-short |  |
| `prompt` | string | 是 | — | Non-blank prompt, at most 4096 Unicode characters. |
| `seconds` | integer / string | 否 | — | Defaults: fast/pro/basic=5; short=8. Basic maximum 5; reference mode minimum 3; short exactly 8. |
| `duration` | integer / string | 否 | — | Defaults: fast/pro/basic=5; short=8. Basic maximum 5; reference mode minimum 3; short exactly 8. |
| `size` | string | 否 | 1920x1080, 1080x1920, 1080x1080, 1440x1080, 1080x1440, 720x1280 | fast/pro/basic: 1080p sizes only; short: 720x1280 only. Actual encoding dimensions are read from the file. |
| `resolution` | string | 否 | 1080p, 720p |  |
| `aspect_ratio` | string | 否 | 16:9, 9:16, 1:1, 4:3, 3:4 |  |
| `input_reference` | string | 否 | — | At most one image file, 20 MiB maximum. |
| `image_url` | string | 否 | — | HTTP(S) image URL or Base64 image data URL. |
| `reference_images` | array | 否 | — |  |
| `generation_mode` | string | 否 | speed, pro, pro_ad |  |
| `n` | integer | 否 | 1 |  |
| `sample_count` | integer | 否 | 1 |  |
| `metadata` | string | 否 | — | JSON-encoded metadata object. |

## 响应

| Status | Description |
| --- | --- |
| 200 | Task accepted. Save id and poll; task status determines eventual success. |
| 400 | Unsupported or conflicting parameters. |
| 401 | Missing or invalid customer API Key. |
| 429 | Capacity or rate limit exceeded. |

### application/json

```json
{
  "id": "task_EXAMPLE",
  "object": "video",
  "status": "queued",
  "progress": 0,
  "created_at": 1790980000
}
```
