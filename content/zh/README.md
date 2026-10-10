---
description: 一个入口，调用图片、视频、语音与更多服务。
---

# 欢迎使用 XY API

XY API 提供统一的调用入口、客户密钥和消费记录。你可以通过同一个账户使用不同能力，具体参数和返回方式以各能力的文档为准。

服务地址：`https://openai.2yanx.dpdns.org`。在[控制台](https://openai.2yanx.dpdns.org)创建客户 API Key 后开始调用。

{% content-ref url="quickstart.md" %}
[quickstart.md](quickstart.md)
{% endcontent-ref %}

{% content-ref url="capabilities.md" %}
[capabilities.md](capabilities.md)
{% endcontent-ref %}

## 选择调用方式

| 需求 | 入口 | 结果 |
| --- | --- | --- |
| 生成图片 | `POST /v1/images/generations` | 图片 URL / Base64；支持 SSE 等待心跳 |
| 参考图编辑 | `POST /v1/images/edits` | 图片 URL / Base64；支持 JSON 和文件上传 |
| 生成视频 | `POST /v1/videos` | 立即返回任务 ID，查询完成后下载 |
| 视频 stream | `POST /v1/responses` + `stream:true` | 进度与最终视频链接 |
| 视频后台调用 | `POST /v1/responses` + `background:true` | 返回 Response ID，之后查询 |
| 语音合成 | `POST /tts/v1/tasks` | 返回任务 ID，查询后下载 MP3；[音色试听与指南](guides/media-tts.md) |

长任务建议使用异步或 stream。连接中断不代表后台任务停止，也不代表未计费；先查原任务和消费记录，再决定是否重新提交。

公开模型名是本站产品调用名称。模型能力、参数限制和实际结果见[模型目录](models.md)及对应指南。
