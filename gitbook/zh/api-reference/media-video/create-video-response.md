# 视频 stream 与后台调用

`POST /v1/responses`

stream:true 返回进度和最终视频链接，以 response.completed 结束；background:true 返回 resp_ ID 供后续查询。流中没有实时视频帧。

[调用指南与限制](../../guides/media-video.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json" path="/v1/responses" method="post" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-video.json
{% endopenapi %}

## application/json

Use stream=true or background=true for long video requests. Video-specific fields are site extensions; no chat/completions protocol.

| 参数 | 类型 | 必填 | 默认值 / 可选值 | 说明 |
| --- | --- | --- | --- | --- |
| `model` | string | 是 | cogvideo-fast, cogvideo-pro, cogvideo-basic, cogvideo-short | 本站公开调用名称，具体能力与限制见指南。 |
| `prompt` | string | 否 | — | 必填，不能为空白，最多 4096 个 Unicode 字符。 |
| `seconds` | integer / string | 否 | — | 整数或整数字符串。fast/pro/basic 默认 5 秒，short 固定 8 秒；basic 最多 5 秒，参考生视频至少 3 秒。 |
| `duration` | integer / string | 否 | — | seconds 的兼容名称，两种写法同时出现时必须一致。 |
| `size` | string | 否 | 1920x1080, 1080x1920, 1080x1080, 1440x1080, 1080x1440, 720x1280 | fast/pro/basic 仅接受 1080p 尺寸，short 仅接受 720x1280；具体枚举见指南。 |
| `resolution` | string | 否 | 1080p, 720p | fast/pro/basic 为 1080p，short 为 720p。 |
| `aspect_ratio` | string | 否 | 16:9, 9:16, 1:1, 4:3, 3:4 | 画面比例；图片默认 1:1，普通视频默认 16:9，short 固定 9:16。 |
| `input_reference` | string | 否 | — | 单张参考图片 URL / data URL；multipart 使用一个文件，最多 20 MiB。 |
| `image_url` | string | 否 | — | 单张 HTTP(S) 图片 URL 或图片 Base64 data URL。 |
| `reference_images` | array | 否 | — | 非空参考图 URL / data URL 数组；与单图输入互斥。 |
| `generation_mode` | string | 否 | speed, pro, pro_ad | 仅参考生视频使用，默认 pro_ad。 |
| `metadata` | object | 否 | — | 视频扩展参数对象；multipart 表单使用 JSON 编码字符串。 |
| `n` | integer | 否 | 1 | 每次仅生成一个产物。 |
| `sample_count` | integer | 否 | 1 | 仅接受 1，不支持多产物。 |
| `input` | string / array | 否 | — | 提示词文本或由 input_text/input_image 等内容组成的消息数组，与 prompt 互斥。 |
| `stream` | boolean | 否 | false | true 返回视频任务进度和最终视频链接。 |
| `background` | boolean | 否 | false | true 时立即返回 Response ID，之后查询结果。 |
| `store` | boolean | 否 | — | 宿主接受的 Responses 协议字段。 |

### 请求示例

```json
{
  "model": "cogvideo-fast",
  "input": "红色纸船在池塘上缓缓漂浮",
  "seconds": "5",
  "stream": true
}
```

## 响应

| Status | Description |
| --- | --- |
| 200 | Response envelope or Responses SSE; inspect the terminal response status, not HTTP status alone. |
| 400 | Unsupported or conflicting parameters. |
| 401 | Missing or invalid customer API Key. |
| 429 | Capacity or rate limit exceeded. |
