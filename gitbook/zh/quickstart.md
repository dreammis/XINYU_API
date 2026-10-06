# 快速开始

先在[控制台](https://openai.2yanx.dpdns.org)创建一个具有目标模型权限、额度充足的客户 API Key。以下示例中的 `YOUR_API_KEY` 是占位符。

## 第一次图片调用

```bash
curl -N https://openai.2yanx.dpdns.org/v1/images/generations \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-image-2","prompt":"白色背景上的黄色圆形，简洁插画","stream":true,"delivery":"url"}'
```

等待期间会收到心跳，成功后收到 `image_url.completed` 事件。从事件的 `url` 下载图片。HTTP 200 本身不代表生图成功；收到 `error` 事件时需要按失败处理。

这是本站自定义 URL 事件，需要客户端自行处理。使用常见 SDK 的 Base64 图片 stream 时省略 `delivery`；详见[图片指南](guides/media-image.md)。

## 第一次视频调用

```bash
curl https://openai.2yanx.dpdns.org/v1/videos \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model":"cogvideo-fast","prompt":"红色纸船在平静的池塘上缓缓漂浮","seconds":"5","size":"1920x1080"}'
```

保存响应中的任务 `id`，每 3–5 秒查询一次：

```bash
curl https://openai.2yanx.dpdns.org/v1/videos/task_EXAMPLE \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

状态为 `completed` 后下载视频：

```bash
curl https://openai.2yanx.dpdns.org/v1/videos/task_EXAMPLE/content \
  -H 'Authorization: Bearer YOUR_API_KEY' -o video.mp4
```

查询接口返回状态；文件通过 `/content` 下载。完整参考图参数与 stream 调用见[视频指南](guides/media-video.md)。
