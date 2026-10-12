# Synthesize speech synchronously

`POST /v1/audio/speech`

Wait for completion and return MP3 bytes. One successful request costs one generation fee. Vox 1 does not support SSE or stream:true. A disconnected request may still generate audio; do not automatically resubmit.

[Guide and limits](../../guides/media-tts.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json?version=bdc985cc3380ed2a" path="/v1/audio/speech" method="post" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json?version=bdc985cc3380ed2a
{% endopenapi %}

## application/json

| Name | Type | Required | Default / values | Description |
| --- | --- | --- | --- | --- |
| `model` | string | yes | vox-1 |  |
| `input` | string | yes | — | Plain text, up to 5000 weighted character units: U+4E00–U+9FFF Han characters count twice, other Unicode code points once. No truncation or splitting. Emotion markup is not interpreted. |
| `voice` | string | yes | — | A voice ID from /assets/media-tts/voices.json on the documentation site. Voices belong to their listed models. |
| `speed` | number | no | 1 | Speaking speed multiplier. |
| `response_format` | string | no | mp3 | Only MP3 is supported. |
| `metadata` | object | no | — |  |

### Example request

```json
{
  "model": "vox-1",
  "input": "你好，欢迎使用我们的语音服务。",
  "voice": "vx_dbd27c4a9332",
  "speed": 1,
  "response_format": "mp3",
  "metadata": {
    "pitch": 0,
    "volume": 0,
    "emotion": "neutral",
    "enhance": true
  }
}
```

## Responses

| Status | Description |
| --- | --- |
| 200 | MP3 audio bytes |
| 400 | JSON response |
| 401 | JSON response |
| 404 | JSON response |
| 422 | JSON response |
| 429 | JSON response |
| 503 | JSON response |
