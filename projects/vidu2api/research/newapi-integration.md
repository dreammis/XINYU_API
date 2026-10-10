# TTS 接入研究

独立任务插件 media-tts，以自有 model/text/voice/parameters/output 协议承载真实参数；未强行兼容 OpenAI。音色仅适用于对应模型，不预造未来渠道适配层。A/B/C 分工、费用测量与文本边界依据见 [渠道说明](../newapi/media-tts/channel.md)。

使用与视频有真实共性的持久生成执行机制，音频/视频独立容量；临时断连恢复原任务，不重复生成。公开字段白名单、中性 vx_ 音色映射、本地试听及 MP3 来源标签去除；客户不直连真实供应商地址。
