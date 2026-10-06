# 检查视频文件

`HEAD /v1/videos/{video_id}/content`

读取文件响应头，不下载正文。

[调用指南与限制](../../guides/media-video.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json" path="/v1/videos/{video_id}/content" method="head" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json
{% endopenapi %}

## 路径与请求头

| Name | In | Required | Description |
| --- | --- | --- | --- |
| `video_id` | path | yes | ID returned by the create operation. |

## 响应

| Status | Description |
| --- | --- |
| 200 | Video headers only. |
| 400 | Unsupported or conflicting parameters. |
| 401 | Missing or invalid customer API Key. |
| 404 | Content unavailable. |
| 429 | Capacity or rate limit exceeded. |
