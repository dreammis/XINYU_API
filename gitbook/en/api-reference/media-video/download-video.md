# Download a video

`GET /v1/videos/{video_id}/content`

Use the task owner customer key. Available after status=completed. Supports HEAD and byte Range.

[Guide and limits](../../guides/media-video.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json" path="/v1/videos/{video_id}/content" method="get" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json
{% endopenapi %}

## Path and header parameters

| Name | In | Required | Description |
| --- | --- | --- | --- |
| `video_id` | path | yes | ID returned by the create operation. |
| `Range` | header | no |  |

## Responses

| Status | Description |
| --- | --- |
| 200 | Full completed video. |
| 206 | Partial content for a Range request. |
| 400 | Unsupported or conflicting parameters. |
| 401 | Missing or invalid customer API Key. |
| 404 | Task/content is not accessible or unavailable. |
| 429 | Capacity or rate limit exceeded. |
