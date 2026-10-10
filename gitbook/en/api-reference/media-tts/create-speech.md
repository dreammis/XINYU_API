# Create a speech task

`POST /tts/v1/tasks`

One task produces one MP3. Fixed billing per successful generation, regardless of text length within the limit. Failed tasks refund the reservation. Save the returned ID before polling.

[Guide and limits](../../guides/media-tts.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json?version=a8a88a1076a1c43d" path="/tts/v1/tasks" method="post" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json?version=a8a88a1076a1c43d
{% endopenapi %}

## application/json

| Name | Type | Required | Default / values | Description |
| --- | --- | --- | --- | --- |
| `model` | string | yes | vox-1 |  |
| `text` | string | yes | — | Plain text, up to 5000 weighted character units: U+4E00–U+9FFF Han characters count twice, other Unicode code points once. No truncation or splitting. Emotion markup is not interpreted. |
| `voice` | string | yes | — | A voice ID from /assets/media-tts/voices.json on the documentation site. Voices belong to their listed models. |
| `parameters` | object | no | — |  |
| `output` | object | no | — |  |

### Example request

```json
{
  "model": "vox-1",
  "text": "你好，欢迎使用我们的语音服务。",
  "voice": "vx_dbd27c4a9332",
  "parameters": {
    "speed": 1,
    "pitch": 0,
    "volume": 0,
    "emotion": "neutral",
    "enhance": true
  },
  "output": {
    "format": "mp3"
  }
}
```

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
  "status": "queued"
}
```
