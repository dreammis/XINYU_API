# Get speech task status

`GET /tts/v1/tasks/{task_id}`

Poll every 3–5 seconds. Terminal states are succeeded and failed. Querying does not create another generation charge.

[Guide and limits](../../guides/media-tts.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json?version=a8a88a1076a1c43d" path="/tts/v1/tasks/{task_id}" method="get" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json?version=a8a88a1076a1c43d
{% endopenapi %}

## Path and header parameters

| Name | In | Required | Description |
| --- | --- | --- | --- |
| `task_id` | path | yes | Public task/artifact identifier. |

## Responses

| Status | Description |
| --- | --- |
| 200 | JSON response |
| 400 | JSON response |
| 401 | JSON response |
| 404 | JSON response |
| 429 | JSON response |
| 503 | JSON response |

### application/json

```json
{
  "id": "task_EXAMPLE",
  "model": "vox-1",
  "status": "succeeded",
  "audio": {
    "format": "mp3",
    "mime_type": "audio/mpeg",
    "artifacts": "/v1/tasks/task_EXAMPLE/artifacts"
  }
}
```
