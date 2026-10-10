# Text to speech API

[Read the guide](../../guides/media-tts.md) · [OpenAPI JSON](https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/tts/v1/tasks` | [Create a speech task](create-speech.md) |
| GET | `/tts/v1/tasks/{task_id}` | [Get speech task status](get-speech.md) |
| GET | `/v1/tasks/{task_id}/artifacts` | [List generated audio artifacts](list-speech-artifacts.md) |
| GET | `/v1/tasks/{task_id}/artifacts/{artifact_key}/content` | [Download audio](download-speech.md) |
| HEAD | `/v1/tasks/{task_id}/artifacts/{artifact_key}/content` | [Get audio headers](head-speech.md) |
