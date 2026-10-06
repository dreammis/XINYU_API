# 视频 API

[调用指南](../../guides/media-video.md) · [OpenAPI JSON](https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json)

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/v1/videos` | [创建视频任务](create-video.md) |
| GET | `/v1/videos/{video_id}` | [查询视频状态](get-video.md) |
| GET | `/v1/videos/{video_id}/content` | [下载视频](download-video.md) |
| HEAD | `/v1/videos/{video_id}/content` | [检查视频文件](head-video.md) |
| POST | `/v1/responses` | [视频 stream 与后台调用](create-video-response.md) |
| GET | `/v1/responses/{response_id}` | [查询后台 Response](get-video-response.md) |
