# Stream or run a video response

`POST /v1/responses`

stream=true reports progress and a final video link via Responses SSE, ending with response.completed. background=true returns a resp_ ID to poll. SSE does not contain video frames.

[Guide and limits](../../guides/media-video.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json" path="/v1/responses" method="post" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json
{% endopenapi %}

## application/json

Use stream=true or background=true for long video requests. Video-specific fields are site extensions; no chat/completions protocol.

| Name | Type | Required | Default / values | Description |
| --- | --- | --- | --- | --- |
| `model` | string | yes | cogvideo-fast, cogvideo-pro, cogvideo-basic, cogvideo-short |  |
| `prompt` | string | no | — | Non-blank prompt, at most 4096 Unicode characters. |
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
| `input` | string / array | no | — | Text or structured text/image messages; cannot be combined with prompt. |
| `stream` | boolean | no | false |  |
| `background` | boolean | no | false |  |
| `store` | boolean | no | — | Responses protocol field accepted by the host. |

### Example request

```json
{
  "model": "cogvideo-fast",
  "input": "红色纸船在池塘上缓缓漂浮",
  "seconds": "5",
  "stream": true
}
```

## Responses

| Status | Description |
| --- | --- |
| 200 | Response envelope or Responses SSE; inspect the terminal response status, not HTTP status alone. |
| 400 | Unsupported or conflicting parameters. |
| 401 | Missing or invalid customer API Key. |
| 429 | Capacity or rate limit exceeded. |
