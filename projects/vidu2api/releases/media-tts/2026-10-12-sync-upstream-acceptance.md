# Vox 1 同步上游发布与验收交付

本记录只确认 A（vidu2api）同步源服务已发布并完成上游验收。B（New API）的客户同步渠道、参数转发、收费及失败结算仍需 C 独立验收。候选 `1.1.0-candidate.openapi.json` 不因此变成正式客户契约；原异步公开通路继续保留。

## 版本与部署

| 项目 | 实际结果 |
| --- | --- |
| 代码提交 | `1d0a8407b0fe9a3137082d2aa404f02374a01ce3` |
| 部署时间 | 2026-10-12 09:26:49 Asia/Shanghai（01:26:49 UTC） |
| 镜像 | `vidu2api:vox-tts-20261012-sync` |
| 镜像 ID | `sha256:0e427bc450402fb5ed226268a6b5efbc64495e4b20114bbf93260d16ffe54211` |
| 复用公网入口 | `https://vidu2api.cgssoccer.com/v1/audio/speech` |
| 源服务直连入口 | `http://127.0.0.1:18320/v1/audio/speech`（源容器内） |
| 原异步入口 | `POST /internal/tts/tasks`、`GET /internal/tts/tasks/{id}`、`GET/HEAD /internal/tts/tasks/{id}/content` |
| 回滚容器 | `vidu2api-pre-vox-20261012-sync`（已停机、断网保留） |

仅覆盖 `gateway/app.py`、`gateway/schemas.py`、`gateway/audio_generation.py`、`gateway/tts_voices.json`，在已核实的前次镜像上构建源码层。无新增服务或入口。原环境变量、Entrypoint、Cmd、WorkingDir、Labels、HostConfig 保持一致，数据卷与两个原网络复用。部署前确认无在途任务并备份 SQLite；启动健康检查通过，部署后逐项核对运行文件 SHA-256 与本地一致。其他未提交工作未进入本次部署。

## Review 与自动验证

重新运行相关测试：71 passed、17 subtests passed。最终重新运行 `uv run pytest tests -q`：**388 passed、27 skipped、40 subtests passed**（41.84 秒）；没有沿用前次结果。Python 编译与改动文件的 `git diff --check` 通过。项目没有在 pyproject.toml 配置 lint/type-check 命令。

Review 修正：先按模型选严格公开协议，避免普通 Union 错误暴露内部模型名；未知模型拒绝。损坏 MP3/任务 JSON 返回502，公开上游输入错误返回中性400。保留旧同步协议的省略模型默认行为和顶层控制。新增回归覆盖默认值、全部声音参数、来源标签、错误与容量、同步中文等价长度报价。自动测试全部 mock 生成并使用临时数据库。

353 个公开音色映射与 `tools/official_voices_all.json` 按稳定 ID 规则生成的结果、C 插件映射逐项一致，共24种语言。A 不额外维护试听、头像或语言目录；映射只在内部使用。

## 真实验收结果

本次严格执行 **2 次同步生成 + 1 次原异步生成**，没有重试生成。使用仅供验收的源服务临时 Key，结束后已删除；本文与证据不包含凭证。

| 验收 | HTTP / 任务结果 | 耗时 | 音频结果 |
| --- | --- | --- | --- |
| 公网同步短文本，公开模型、音色及全套控制 | 200、`audio/mpeg` | 13.996 秒 | 67,392 bytes；4.176 秒音频 |
| 源服务直连同步2500汉字，5000加权单位 | 200、`audio/mpeg` | 21.470 秒 | 10,156,032 bytes；634.716 秒音频 |
| 原异步入口创建、查询与下载 | submit200 queued → succeeded；content200 | 提交后约10.104秒 | 62,208 bytes；3.852 秒音频 |
| 原异步内容 HEAD / Range / 匿名访问 | 200 / 206 / 401 | — | 原鉴权与字节范围行为保留 |
| 超长文本、未知音色、wav、null metadata、顶层控制、非法 speed、未知模型 | 7 项均422、JSON | — | 无生成提交 |
| 匿名同步请求 | 401、JSON | — | 无生成提交 |

三份文件均为 MP3、32kHz、单声道。`ffmpeg` 全文件解码成功且无解码错误，`ffprobe` 未检出 format/stream 来源标签；剥标签函数验证输出已无ID3/APEv2来源标签。成功响应为音频二进制，没有任务排队 JSON。

数据库中的两次同步任务均为success，公开模型/音色到内部值的映射核对一致，保存的原文分别25字符和2500汉字。只读查询已完成的上游短任务（不产生新生成），实际回显 `speed=1.25`、`pitch=-2`、`volume=5`、`emotion=happy`、`enhance=false`，音色映射匹配。声音参数已经到达供应商，未仅凭请求200推断透传。

实际短请求（鉴权值省略）：

```http
POST https://vidu2api.cgssoccer.com/v1/audio/speech
Authorization: Bearer <验收临时凭证，已删除>
Content-Type: application/json
```

```json
{
  "model": "vox-1",
  "input": "你好，这是同步语音验收。声音参数已传入，欢迎使用。",
  "voice": "vx_dbd27c4a9332",
  "speed": 1.25,
  "response_format": "mp3",
  "metadata": {"pitch": -2, "volume": 5, "emotion": "happy", "enhance": false}
}
```

```http
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Content-Length: 67392

<MP3 二进制，SHA-256 cbe1e6bd5efbe90675c9ff8e375fdb8e501f7a835b14dc567510152287c1d300>
```

长文本为 `"你好欢迎使用语音服务"` 重复250次，原文提交不截断；省略speed和metadata，按 schema 默认 speed1、pitch0、volume0（基础值）、emotion空、enhance true。使用加权长度等价 ASCII 做费用预检，本次未发生414。

机器可读脱敏证据见 [2026-10-12-sync-upstream-evidence.json](./2026-10-12-sync-upstream-evidence.json)。本机音频和完整验收输出存于忽略目录 `.local/projects/vidu2api/tts-sync/`，不导入客户站。该证据属于内部发布记录，不能直接充当 B 客户调用/账单证据。

## 交给 C 的下一步与边界

1. B 当前渠道24是type61任务插件，保留原异步路由；核对内置语音渠道的真实模型选择和转发路径，独立配置并验收同步入口。
2. 用客户 Key 证明 `metadata` 经 B 保留，并确认客户收到MP3、错误语义和实际计费。A 严格拒绝未知字段，不证明 B 会保留未知顶层字段。
3. 验证客户短文本、长中文、失败、超时/断连后的真实扣费；既有异步按次售价/退款规则不能自动视为同步计费规则。
4. 客户同步验收通过后，C 才更新正式契约、指南、调试器并发布；同时保留旧异步任务入口。

本次公网仅实测短文本，最长中文实测在源容器直连；未证明最长文本经过 B/CDN 的结果。21.470秒是本次直连实测值，不是最大延迟承诺：同步请求可能排队，上游任务轮询允许1200秒。源码显示客户端断连后运行中的生成可能继续，不能把断连当作未生成，也不能自动重发来掩盖失败。B 仍须单独验证自己的连接超时与结算行为。
