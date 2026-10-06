# Get video task status

`GET /v1/videos/{video_id}`

Poll every 3–5 seconds using a customer key belonging to the task owner. Completed tasks can be downloaded via /content.

[Guide and limits](../../guides/media-video.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json" path="/v1/videos/{video_id}" method="get" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json
{% endopenapi %}

## Path and header parameters

| Name | In | Required | Description |
| --- | --- | --- | --- |
| `video_id` | path | yes | ID returned by the create operation. |

## Responses

| Status | Description |
| --- | --- |
| 200 | Current status. |
| 400 | Unsupported or conflicting parameters. |
| 401 | Missing or invalid customer API Key. |
| 404 | Task is not accessible. |
| 429 | Capacity or rate limit exceeded. |
