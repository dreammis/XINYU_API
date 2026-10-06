# 查询后台 Response

`GET /v1/responses/{response_id}`

查询 background:true 返回的 resp_ ID。metadata.task_id 可用于下载视频。

[调用指南与限制](../../guides/media-video.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json?version=9ea567a7401837be" path="/v1/responses/{response_id}" method="get" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json?version=9ea567a7401837be
{% endopenapi %}

## 路径与请求头

| Name | In | Required | Description |
| --- | --- | --- | --- |
| `response_id` | path | yes |  |

## 响应

| Status | Description |
| --- | --- |
| 200 | Current response state. |
| 400 | Unsupported or conflicting parameters. |
| 401 | Missing or invalid customer API Key. |
| 404 | Response is not accessible. |
| 429 | Capacity or rate limit exceeded. |
