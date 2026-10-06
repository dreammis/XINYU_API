# Videos API

[Read the guide](../../guides/media-video.md) · [OpenAPI JSON](https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/v1/videos` | [Create a video task](create-video.md) |
| GET | `/v1/videos/{video_id}` | [Get video task status](get-video.md) |
| GET | `/v1/videos/{video_id}/content` | [Download a video](download-video.md) |
| HEAD | `/v1/videos/{video_id}/content` | [Inspect video headers](head-video.md) |
| POST | `/v1/responses` | [Stream or run a video response](create-video-response.md) |
| GET | `/v1/responses/{response_id}` | [Get a background video response](get-video-response.md) |
