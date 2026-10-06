# 查询视频状态

`GET /v1/videos/{video_id}`

使用任务所属账户的客户密钥，每 3–5 秒查询一次。完成后从 /content 下载文件。

[调用指南与限制](../../guides/media-video.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json" path="/v1/videos/{video_id}" method="get" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json
{% endopenapi %}

## 路径与请求头

| Name | In | Required | Description |
| --- | --- | --- | --- |
| `video_id` | path | yes | ID returned by the create operation. |

## 响应

| Status | Description |
| --- | --- |
| 200 | Current status. |
| 400 | Unsupported or conflicting parameters. |
| 401 | Missing or invalid customer API Key. |
| 404 | Task is not accessible. |
| 429 | Capacity or rate limit exceeded. |
