# 下载视频

`GET /v1/videos/{video_id}/content`

任务完成后下载视频，使用任务所属账户的客户密钥，支持 HEAD 与 Range。

[调用指南与限制](../../guides/media-video.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json?version=9ea567a7401837be" path="/v1/videos/{video_id}/content" method="get" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json?version=9ea567a7401837be
{% endopenapi %}

## 路径与请求头

| Name | In | Required | Description |
| --- | --- | --- | --- |
| `video_id` | path | yes | ID returned by the create operation. |
| `Range` | header | no |  |

## 响应

| Status | Description |
| --- | --- |
| 200 | Full completed video. |
| 206 | Partial content for a Range request. |
| 400 | Unsupported or conflicting parameters. |
| 401 | Missing or invalid customer API Key. |
| 404 | Task/content is not accessible or unavailable. |
| 429 | Capacity or rate limit exceeded. |
