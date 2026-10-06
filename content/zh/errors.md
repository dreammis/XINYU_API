# 错误与任务恢复

先区分请求被拒绝、后台任务失败和产物交付中断。它们对任务是否已经执行的含义不同。

| 情况 | 处理方式 |
| --- | --- |
| 400，参数错误或参数冲突 | 根据对应接口规范修改参数后再提交 |
| 401 / 403，密钥或权限问题 | 检查客户密钥、模型权限与账户限制 |
| 429，容量或速率限制 | 等待容量恢复；入口明确拒绝的图片请求不会提交生成 |
| 413，上传超限 | 减小文件或改用可读取的参考图 URL |
| 视频状态 `failed` | 读取错误；原任务失败后按计费说明退款 |
| 图片 stream 中 `error` | 视为失败事件，保留请求 ID；HTTP 200 不能覆盖这个错误 |
| 超时、502/504、断连 | 先查原任务与消费记录，确认执行结果后再决定重提 |

## 图片 stream

默认成功事件是 `image_generation.completed` 或 `image_edit.completed`。使用 `delivery:"url"` 时为 `image_url.completed`。心跳只表示连接仍保持；`[DONE]` 也不能替代成功事件。

收到 Base64 完成事件后验证并保存图片；URL 事件则下载对应产物。保留 `X-Image-Request-Id` 和完成事件中的 `request_id`，方便服务方查单。

## 视频任务

`queued` / `in_progress` 时继续查询，`completed` 时下载，`failed` 时按失败处理。`unknown` 表示状态暂不可识别，不能当作完成或据此创建新任务。

Responses stream 返回最终 `response.completed` 时，还应检查终态与输出内容。后台 Responses 保存 `resp_...` 和 `metadata.task_id`，分别用于状态查询与视频下载。

具体限制见[图片指南](guides/media-image.md)和[视频指南](guides/media-video.md)。
