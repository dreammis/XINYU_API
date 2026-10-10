# 下载音频

`GET /v1/tasks/{task_id}/artifacts/{artifact_key}/content`

Use the task owner customer key. The audio artifact key is audio. Supports byte Range. Downloading an existing audio does not create a new generation charge.

[调用指南与限制](../../guides/media-tts.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json?version=a8a88a1076a1c43d" path="/v1/tasks/{task_id}/artifacts/{artifact_key}/content" method="get" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json?version=a8a88a1076a1c43d
{% endopenapi %}

## 路径与请求头

| Name | In | Required | Description |
| --- | --- | --- | --- |
| `task_id` | path | yes | Public task/artifact identifier. |
| `artifact_key` | path | yes | Public task/artifact identifier. |
| `Range` | header | no |  |

## 响应

| Status | Description |
| --- | --- |
| 200 | MP3 audio. |
| 206 | Partial audio bytes. |
| 400 | JSON response |
| 401 | JSON response |
| 404 | JSON response |
| 416 | Requested byte range is invalid. |
| 429 | JSON response |
| 503 | JSON response |
