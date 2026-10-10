# List generated audio artifacts

`GET /v1/tasks/{task_id}/artifacts`

Call after succeeded. Use returned content URLs without substituting an upstream address.

[Guide and limits](../../guides/media-tts.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json?version=a8a88a1076a1c43d" path="/v1/tasks/{task_id}/artifacts" method="get" %}
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
  "task_id": "task_EXAMPLE",
  "artifacts": [
    {
      "key": "audio",
      "type": "audio",
      "mime_type": "audio/mpeg",
      "content_url": "https://openai.2yanx.dpdns.org/v1/tasks/task_EXAMPLE/artifacts/audio/content"
    }
  ]
}
```
