# Create a video task

`POST /v1/videos`

Create one asynchronous task. Fixed per-video billing; failed tasks are refunded. Do not re-submit after a client timeout without checking the existing task.

[Guide and limits](../../guides/media-video.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json?version=9ea567a7401837be" path="/v1/videos" method="post" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json?version=9ea567a7401837be
{% endopenapi %}

## application/json

Conflicting aliases/metadata are rejected. Single-image and reference-image inputs are mutually exclusive. For reference mode use fast/pro and 3–10 seconds.

| Name | Type | Required | Default / values | Description |
| --- | --- | --- | --- | --- |
| `model` | string | yes | cogvideo-fast, cogvideo-pro, cogvideo-basic, cogvideo-short |  |
| `prompt` | string | yes | — | Non-blank prompt, at most 4096 Unicode characters. |
| `seconds` | integer / string | no | — | Defaults: fast/pro/basic=5; short=8. Basic maximum 5; reference mode minimum 3; short exactly 8. |
| `duration` | integer / string | no | — | Defaults: fast/pro/basic=5; short=8. Basic maximum 5; reference mode minimum 3; short exactly 8. |
| `size` | string | no | 1920x1080, 1080x1920, 1080x1080, 1440x1080, 1080x1440, 720x1280 | fast/pro/basic: 1080p sizes only; short: 720x1280 only. Actual encoding dimensions are read from the file. |
| `resolution` | string | no | 1080p, 720p |  |
| `aspect_ratio` | string | no | 16:9, 9:16, 1:1, 4:3, 3:4 |  |
| `input_reference` | string | no | — | HTTP(S) image URL or Base64 image data URL. |
| `image_url` | string | no | — | HTTP(S) image URL or Base64 image data URL. |
| `reference_images` | array | no | — |  |
| `generation_mode` | string | no | speed, pro, pro_ad |  |
| `metadata` | object | no | — |  |
| `n` | integer | no | 1 |  |
| `sample_count` | integer | no | 1 |  |

### Example request

```json
{
  "model": "cogvideo-fast",
  "prompt": "红色纸船在平静的池塘上缓缓漂浮",
  "seconds": "5",
  "size": "1920x1080"
}
```

## multipart/form-data

| Name | Type | Required | Default / values | Description |
| --- | --- | --- | --- | --- |
| `model` | string | yes | cogvideo-fast, cogvideo-pro, cogvideo-basic, cogvideo-short |  |
| `prompt` | string | yes | — | Non-blank prompt, at most 4096 Unicode characters. |
| `seconds` | integer / string | no | — | Defaults: fast/pro/basic=5; short=8. Basic maximum 5; reference mode minimum 3; short exactly 8. |
| `duration` | integer / string | no | — | Defaults: fast/pro/basic=5; short=8. Basic maximum 5; reference mode minimum 3; short exactly 8. |
| `size` | string | no | 1920x1080, 1080x1920, 1080x1080, 1440x1080, 1080x1440, 720x1280 | fast/pro/basic: 1080p sizes only; short: 720x1280 only. Actual encoding dimensions are read from the file. |
| `resolution` | string | no | 1080p, 720p |  |
| `aspect_ratio` | string | no | 16:9, 9:16, 1:1, 4:3, 3:4 |  |
| `input_reference` | string | no | — | At most one image file, 20 MiB maximum. |
| `image_url` | string | no | — | HTTP(S) image URL or Base64 image data URL. |
| `reference_images` | array | no | — |  |
| `generation_mode` | string | no | speed, pro, pro_ad |  |
| `n` | integer | no | 1 |  |
| `sample_count` | integer | no | 1 |  |
| `metadata` | string | no | — | JSON-encoded metadata object. |

## Responses

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
