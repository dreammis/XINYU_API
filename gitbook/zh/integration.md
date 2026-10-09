# 开始使用

从客户 API Key 开始，完成一次调用，再选择适合业务的调用方式。

## 先完成第一次调用

1. 在[控制台](https://openai.2yanx.dpdns.org)创建客户 API Key，确认余额和目标模型权限。
2. 按[快速开始](quickstart.md)完成图片生成或视频创建、查询、下载。
3. 在[模型中心](models.md)查看公开调用名称和对应限制。

## 配置客户端

HTTP 服务地址为 `https://openai.2yanx.dpdns.org`。使用需要 `/v1` 前缀的 SDK 时，Base URL 配置为 `https://openai.2yanx.dpdns.org/v1`；手工调用 HTTP 时使用接口页上的完整路径，避免重复添加 `/v1`。

所有客户请求使用 `Authorization: Bearer YOUR_API_KEY`。具体操作是否支持 JSON、文件上传、流式或后台任务，以该接口规范为准。

## 根据任务选择调用方式

- 图片先使用普通 JSON 请求理解输入输出；长请求的流式事件见[图像指南](guides/media-image.md)。
- 视频推荐创建任务、查询状态、下载结果三个步骤，见[视频指南](guides/media-video.md)。
- 对接客户端前确认它支持相应路径和结果格式，只有聊天接口的客户端不能直接代替图片或视频客户端。

## 继续阅读

- [鉴权与客户 Key](authentication.md)
- [计费与失败处理](billing.md)
- [错误与任务恢复](errors.md)
- [常见问题](faq.md)
