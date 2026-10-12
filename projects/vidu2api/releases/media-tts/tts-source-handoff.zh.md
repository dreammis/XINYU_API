# 发给 vidu2api 工程 AI：同步 TTS 实现与部署验收

请在 `G:/workspace/vidu2api` 接手现有 TTS 改动。文档中心是 `G:/workspace/xyapi_doc`，线上 New API 是 `https://openai.2yanx.dpdns.org`。先读文档中心 `START_HERE.md` 和本能力的 `2026-10-12-sync-review.md`。

## 目标和边界

复用你们已有的 `POST /v1/audio/speech`，成功直接返回 `Content-Type: audio/mpeg` 的 MP3。模型使用客户公开名称 `vox-1`，音色使用 `vx_` ID；服务内部转换为原模型和原音色。保留已有异步接口。无需新增代理或入口服务。

以下改动已由文档中心 AI 写入你的本地工程，尚未部署；先 review 当前 diff，保留你们其他未提交工作，不要整份覆盖：

| 文件 | 修改原因 |
| --- | --- |
| `gateway/schemas.py` | 现有同步协议不认识 `vox-1` 和公开音色；新增独立严格 schema，与旧请求区分；统一加权文本长度及声音控制。 |
| `gateway/tts_voices.json` | 353 个公开音色 ID 到内部音色的映射，与文档中心异步插件来源一致。内部映射不得公开。 |
| `gateway/app.py` | 在原语音路由转换模型、音色和控制参数，调用原执行器，返回 MP3；清除音频中的来源元数据。 |
| `gateway/audio_generation.py` | 同步与异步费用预检使用相同加权长度，避免长中文 GET 触发 414；生成仍提交原文。 |
| `tests/test_vox_speech.py` | 真实 HTTP 路由回归：MP3 返回、映射、参数和长度校验；生成器 mock，不产生费用。 |
| `.trellis/spec/backend/newapi-tts-integration-contracts.md` | 记录待发布的同步接入约定，不能当成线上已经支持。 |

## 请求约定

```json
{
  "model": "vox-1",
  "input": "你好，这是语音测试。",
  "voice": "vx_dbd27c4a9332",
  "speed": 1,
  "response_format": "mp3",
  "metadata": {"pitch": 0, "volume": 5, "emotion": "neutral", "enhance": false}
}
```

`metadata` 是本服务的扩展约定：当前 New API 音频转发会保留这个字段，却会丢弃未声明的顶层声音控制。省略扩展时使用 schema 已定义的默认值；实际允许范围以本地 `VoxSpeechRequest` 和候选 OpenAPI 为准。失败返回明确错误，不能把排队任务 JSON 当作同步成功音频。

## 请依次完成

1. Review 上述本地改动，运行相关测试和全量测试。前次全量结果为 385 passed、27 skipped、40 subtests passed；重新核对，不能用旧结果证明新修改正确。
2. 使用本工程已有部署方式发布，复用原服务和路由。不要新建入口服务。
3. 验收上游直连 `/v1/audio/speech`：正确 MP3、公开模型/音色映射、声音控制、长中文、错误响应；同时确认原异步入口可用。真实生成会产生费用，按用户授权控制次数。
4. 给文档中心交付：服务版本/提交、部署时间、入口、已验证参数、脱敏请求/响应证据。不要把上游凭证写进客户文档或回复。
5. New API 客户入口仍需独立验收：现有渠道 24 是 type 61 任务插件，不能直接视为普通语音渠道。文档中心负责核对内置语音渠道选择、参数透传、客户 MP3 和实际计费，保留旧异步任务通路。

候选契约在文档中心 `projects/vidu2api/releases/media-tts/1.1.0-candidate.openapi.json`，尚未导入公开文档。客户经过 New API 的同步入口验收通过后，文档中心才更新正式契约、指南、调试器并发布。源工程上线不等于客户入口上线。

## 音色展示的维护位置

源目录来自本工程 `tools/official_voices_all.json`。文档中心维护公开目录、试听、头像、语言展示；业务服务只维护接入行为。当前 353 个音色、24 种语言、19 个已有头像；缺头像使用网站统一默认图标。不要在源工程另外手抄公开音色表。
