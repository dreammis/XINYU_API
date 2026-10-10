# A 内部 TTS 接口

真实来源 Vidu，由 A 提供 authenticated POST /internal/tts/tasks、GET /internal/tts/tasks/{id} 和 GET/HEAD /internal/tts/tasks/{id}/content。公开插件只向客户展示 vox-1 和 vx_ 音色。

内部提交 AudioTaskRequest 使用 input_text/voice_id/speed/pitch/volume/emotion/enhance，固定 MP3；最多5000加权单位，汉字计2。普通文本原样提交，GET 费用预检使用等价 ASCII 单位避免 URI414。任务参数先持久化，remoteID/账号持久化后继续查询；产物保存在持久 data/tts_audio。

公开客户规范以 newapi/media-tts/public-openapi.json 为准，不将内部 schema 直接发布。同步旧音频入口保持其既有协议。
