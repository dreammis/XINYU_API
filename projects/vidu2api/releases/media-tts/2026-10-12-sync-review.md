# TTS 同步/异步审查历史与后续上线

本记录的“待发布/未上传”段落记录前期审查状态；现已完成 A 部署、B 客户验收与计费修正，正式结果见 [1.1.0.md](./1.1.0.md)。当前公开契约为1.1.0，不能以本历史状态判断线上。

## 结论与决定

用户要求 TTS 默认同步，并使用常规做法。采用现有 A `POST /v1/audio/speech` 返回 MP3，B 复用内置语音转发。不新增入口服务，不在文档站轮询伪装 API 同步。旧异步接口保留兼容；新输入使用同一套标准字段和明确扩展。

当前线上仍为 media-tts 1.0.0 异步协议，本记录不表示同步已部署。本次没有管理写入或付费生成，没有将候选契约导入公开文档。

## 已确认的问题与证据

1. C 插件 meta.routes 的 POST /tts/v1/tasks 是 submit，parseSubmitResponse 只返回上游任务 ID；native.created 对 QUEUED 返回 queued。已用实际模块重现用户所见的响应。这是已发布的异步设计，不是文档展示错误。
2. A 原有 `/v1/audio/speech` 等待音频执行器并返回 Response(audio/mpeg)，能够复用。原同步 schema 的文本长度是4096普通字符，异步为5000加权单位；原同步不认识公开 vx_ 音色，不能只给 B 改路径后称行为一致。
3. B 当前 v1.0.0-rc.41 固定源码2035a82a中，relay/audio_handler.go 经 AudioRequest 和 ConvertAudioRequest 重建 JSON。relaykit/dto/audio.go 有 speed、response_format、metadata，没有顶层 pitch/volume/emotion/enhance。这些扩展必须通过保留字段传递；不能依赖静默丢字段。
4. A 长中文费用预检原来只在异步路径使用等价加权长度 ASCII，原同步仍发送全文 GET；已有真实414证据。因此本地统一预检长度，生成提交保留原文。
5. 文档 operationExamples 原来无条件将普通模式标作 JSON，即使成功响应是音频。已改为只看2xx成功 Content-Type，音频显示音频文件；错误响应的JSON不参与成功模式选择。
6. 不同协议状态名有合理差异：OpenAI 视频 queued/in_progress/completed/failed，自有 TTS queued/running/succeeded/failed。不能为了表面一致破坏现有客户端。
7. 插件原来把未知任务状态默认展示为running，并把显式null的参数对象当成默认值。已在本地修正为明确拒绝，使非法状态/参数不被正常响应掩盖。

## 已完成的本地实现

- A：gateway/schemas.py 增加 VoxSpeechRequest 和声音 metadata 控制；保留原 vidu-tts schema，通过公开模型区分请求。公开音色映射保存在 gateway/tts_voices.json，与 C 插件353个映射一致。
- A：gateway/app.py 复用同一语音路由和执行器，处理 vox-1 与 vx_ 音色、声音控制，直接返回清理来源标签后的 MP3。
- A：gateway/audio_generation.py 同步/异步均按等价加权长度预检，提交原文。
- C：plugin.js 允许异步入口接受新的 input/speed/response_format/metadata 请求，保留旧格式并拒绝混用；未上传。
- C：文档成功响应类型配对修正；同步候选OpenAPI在1.1.0-candidate.openapi.json，不在sources登记。现有公开契约仍准确描述线上异步入口。

## 后续发布必须完成

本地验证：A `uv run pytest tests -q` 为385 passed、27 skipped、40 subtests passed；实际HTTP同步回归在tests/test_vox_speech.py，先重现模型/音色未转换再修复。C `npm test` 为95/95；最后补充非法null/未知状态拒绝后，相关11项测试再次通过。build、docs:check、候选OpenAPI校验和git diff --check通过。测试无真实生成和管理写入，不能替代线上账单验收。

1. 核对 A 当前运行镜像，部署上述 A 文件，不覆盖该工程其他未提交工作。继续使用原路由，不安装新服务。
2. 核对 B 当前渠道24的 type61 和模型选择逻辑。现有type61是任务插件渠道，不等于普通语音渠道；选择当前宿主真正支持的内置语音渠道配置，同时证明旧native异步任务仍选中media-tts。不可未经核对就改type、创建重名高优先级渠道或宣称不影响在途任务。
3. 对新格式升版插件及候选契约，核对每个参数经 B 后真正保留。宿主可能丢掉未知顶层字段，A的严格校验并不证明客户经过B时所有未知字段都会被拒绝。
4. 用有限客户Key验收一次短文本同步MP3、参数/音色、失败、实际计费；再验收相同字段的异步任务、旧格式兼容和查询/下载。查同步失败/断连的实际收费行为，不能把旧任务退款规则自动照抄到内置语音转发。
5. 验收后将候选作为public-openapi，指南默认改为同步，旧任务页标明异步兼容。完成版本一致性、docs:sync、build、docs:check、npm test，再发布。

本机New API管理凭证已完成只读验证，线上版本再次确认为v1.0.0-rc.41。现有A服务的部署连接尚未确定，因此不将源代码变更写成服务上线；也不提前让客户调试未上线的同步规范。

后续所有 TTS 按 [模式规范](../../../../docs/integration/api-execution-modes.md) 交付；该规范定义目标，未验证能力仍以当前公开契约为准。

## A 上游发布交付（2026-10-12 09:26:49 Asia/Shanghai）

A 已复用原服务发布同步实现，代码提交 `1d0a840`，四个运行文件的实际哈希已核对。重新全量测试388 passed、27 skipped、40 subtests passed。两次同步（公网短文本、直连2500汉字）与一次原异步真实生成均成功；MP3全文件解码和来源标签检查通过，真实上游详情确认全部声音控制与音色映射。临时验收Key已删除，没有生成重试。

完整版本、部署与脱敏证据见 [上游验收交付](./2026-10-12-sync-upstream-acceptance.md) 和 [机器证据](./2026-10-12-sync-upstream-evidence.json)。这仅更新A上线状态，不表示B客户同步入口或计费已验收；候选契约仍需按前述顺序经C完成客户验收后发布。
