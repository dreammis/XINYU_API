# 语音合成 API

[调用指南](../../guides/media-tts.md) · [OpenAPI JSON](https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json)

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/tts/v1/tasks` | [创建语音任务](create-speech.md) |
| GET | `/tts/v1/tasks/{task_id}` | [查询语音任务](get-speech.md) |
| GET | `/v1/tasks/{task_id}/artifacts` | [获取音频产物地址](list-speech-artifacts.md) |
| GET | `/v1/tasks/{task_id}/artifacts/{artifact_key}/content` | [下载音频](download-speech.md) |
| HEAD | `/v1/tasks/{task_id}/artifacts/{artifact_key}/content` | [查询音频文件头](head-speech.md) |
