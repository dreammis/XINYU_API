# Video Studio 视频 API

服务地址：`https://openai.2yanx.dpdns.org`。使用站点创建的客户 API Key，以 `Authorization: Bearer YOUR_API_KEY` 鉴权；控制台管理令牌不能作为生成密钥。

## 模型与价格

以下名称是本站的产品调用别名。名称中的 `cogvideo` 不表示返回结果由开源 CogVideo 权重生成。

| 模型 | 文生 | 单图生 | 多参考图生 | 时长 | 默认尺寸 |
| --- | --- | --- | --- | --- | --- |
| `cogvideo-fast` | 支持 | 支持 | 支持 | 文/图生 1–10 秒；参考生 3–10 秒；默认 5 秒 | 1920×1080 |
| `cogvideo-pro` | 支持 | 支持 | 支持 | 文/图生 1–10 秒；参考生 3–10 秒；默认 5 秒 | 1920×1080 |
| `cogvideo-basic` | 支持 | 支持 | 不支持 | 1–5 秒；默认 5 秒 | 1920×1080 |
| `cogvideo-short` | 支持 | 不支持 | 不支持 | 固定 8 秒 | 720×1280 |

默认分组每条成功视频价格为 **USD 0.04109589**，按本站当前换算约 **CNY 0.30**。每次请求只生成一条；不按秒数、分辨率或生成模式加倍收费。提交时预扣，任务失败后退款；参数校验失败不扣费。其他分组以站点实际分组倍率和价格页为准。

## 异步生成与下载

推荐调用 `POST /v1/videos`，立即取得任务 ID，轮询 `GET /v1/videos/{id}`，完成后调用 `GET /v1/videos/{id}/content` 下载。可以使用 `HEAD` 检查文件与 `Range` 获取分段内容。

```bash
curl https://openai.2yanx.dpdns.org/v1/videos \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"cogvideo-fast","prompt":"红色纸船在平静的池塘上缓缓漂浮，固定镜头，柔和日光","seconds":"5","size":"1920x1080"}'
```

响应示例（ID 与时间仅为示意）：

```json
{"id":"task_EXAMPLE","object":"video","status":"queued","progress":0,"created_at":1790980000}
```

```bash
curl https://openai.2yanx.dpdns.org/v1/videos/task_EXAMPLE \
  -H "Authorization: Bearer YOUR_API_KEY"

curl https://openai.2yanx.dpdns.org/v1/videos/task_EXAMPLE/content \
  -H "Authorization: Bearer YOUR_API_KEY" -o video.mp4
```

状态为 `queued`、`in_progress`、`completed`、`failed`。建议每 3–5 秒查询一次。`completed` 后可以下载；失败时响应包含通用 `video_generation_failed` 错误。查询和下载须使用任务所属账户的客户密钥。

## 请求参数

| 字段 | 类型 / 默认值 | 说明 |
| --- | --- | --- |
| `model` | 字符串，必填 | 上表四个名称之一 |
| `prompt` | 字符串，必填 | 1–4096 个字符，不能为空白 |
| `seconds` | 整数字符串或整数 | 各模型约束见上表 |
| `size` | 字符串 | 下表支持尺寸；省略使用模型默认值 |
| `input_reference` | URL、图片 Data URL 或 multipart 图片文件 | 单图生视频；short 不支持 |
| `metadata.reference_images` | 图片 URL / Data URL 数组 | 按输入顺序引用的参考图；仅 fast/pro |
| `metadata.mode` | 字符串，可省略 | `text_to_video`、`image_to_video` 或 `reference_to_video`；若指定须与图片输入一致 |
| `metadata.generation_mode` | 字符串，参考生默认 `pro_ad` | 仅参考生可用：`speed`、`pro`、`pro_ad` |
| `n` / `sample_count` | 整数，默认 1 | 仅接受 1 |

fast/pro/basic 可选尺寸：`1920x1080`（16:9）、`1080x1920`（9:16）、`1080x1080`（1:1）、`1440x1080`（4:3）、`1080x1440`（3:4），均为 1080p。short 仅 `720x1280`（720p、9:16）。最终编码尺寸以文件为准。

兼容字段：`duration` 等价于 `seconds`；`image_url` 等价于单图 `input_reference`；`reference_images`、`generation_mode` 可直接放顶层；`resolution`、`aspect_ratio` 可替代 `size`，也可放入 `metadata`。同一参数有多个写法时必须一致；单图和参考图不可混用。未知参数会报错，不会静默忽略。当前不提供首尾帧、视频延长、remix 或批量多产物。

单图 multipart 示例（图片文件最大 20 MiB；实际可上传请求还受站点入口限制）：

```bash
curl https://openai.2yanx.dpdns.org/v1/videos \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F model=cogvideo-fast \
  -F 'prompt=保持纸船的外形与颜色，在水面缓缓漂浮' \
  -F seconds=5 \
  -F input_reference=@boat.png
```

多参考图示例：

```json
{
  "model": "cogvideo-pro",
  "prompt": "[@图1]的红色纸船与[@图2]的黄色纸船并排缓缓漂浮，保持参考图的插画风格，固定镜头",
  "seconds": "5",
  "metadata": {
    "mode": "reference_to_video",
    "reference_images": ["https://example.com/red.png", "https://example.com/yellow.png"],
    "generation_mode": "pro_ad"
  }
}
```

## 同步、流式和后台调用

`POST /v1/responses` 支持三种方式，视频请求使用 `input` 作为提示词，其他视频参数沿用上面的定义。

```bash
curl -N https://openai.2yanx.dpdns.org/v1/responses \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"cogvideo-fast","input":"红色纸船在池塘上缓缓漂浮","seconds":"5","stream":true}'
```

- `stream: true`：SSE 返回任务进度，生成完毕后输出包含视频链接的 HTML 文本，最后收到 `response.completed`。流中传输的是状态与结果链接，不是实时播放尚未生成的逐帧视频。
- 省略 `stream` 和 `background`：HTTP 请求等待任务完成，返回 `status: completed` 和结果。调用方及站点入口代理超时需足够长。本站已验证较快的同步请求成功，也观测到较长请求在代理层中断、后台仍完成的情况，因此生产调用推荐异步或 stream。HTTP 超时不等于任务失败，不要据此自动重复提交。
- `background: true`：立即返回 `resp_...`，使用 `GET /v1/responses/{response_id}` 查询。结果中的 `metadata.task_id` 可用于视频下载。

成功结果位于 `output[].content[].text`，形如 `<video controls src="站点产物链接"></video>`。该链接带有访问凭据，可供播放器使用；应当像私有文件分享链接一样保管。重新查询结果可能生成新的访问链接。也可用客户 Key 与 `metadata.task_id` 访问 `/v1/videos/{task_id}/content`。

接口采用本站的视频扩展约定。客户端需要支持 `/v1/videos` 或 Responses 视频输出；只支持 `/v1/chat/completions` 的客户端不能直接调用这些模型。
