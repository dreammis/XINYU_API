# Get a background video response

`GET /v1/responses/{response_id}`

Poll the resp_ ID returned by background=true. Preserve metadata.task_id for video download.

[Guide and limits](../../guides/media-video.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json?version=9ea567a7401837be" path="/v1/responses/{response_id}" method="get" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json?version=9ea567a7401837be
{% endopenapi %}

## Path and header parameters

| Name | In | Required | Description |
| --- | --- | --- | --- |
| `response_id` | path | yes |  |

## Responses

| Status | Description |
| --- | --- |
| 200 | Current response state. |
| 400 | Unsupported or conflicting parameters. |
| 401 | Missing or invalid customer API Key. |
| 404 | Response is not accessible. |
| 429 | Capacity or rate limit exceeded. |
