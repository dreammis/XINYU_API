# Inspect video headers

`HEAD /v1/videos/{video_id}/content`

Read content headers without downloading a body.

[Guide and limits](../../guides/media-video.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json?version=9ea567a7401837be" path="/v1/videos/{video_id}/content" method="head" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json?version=9ea567a7401837be
{% endopenapi %}

## Path and header parameters

| Name | In | Required | Description |
| --- | --- | --- | --- |
| `video_id` | path | yes | ID returned by the create operation. |

## Responses

| Status | Description |
| --- | --- |
| 200 | Video headers only. |
| 400 | Unsupported or conflicting parameters. |
| 401 | Missing or invalid customer API Key. |
| 404 | Content unavailable. |
| 429 | Capacity or rate limit exceeded. |
