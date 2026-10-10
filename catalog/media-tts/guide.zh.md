# 语音合成与音色试听

Vox 1 把文字生成一份 MP3 音频，适合短视频配音、播报和普通朗读。使用自有 TTS 任务接口，支持音色、语速、音调、音量、情绪和增强控制。

## 模型与价格

| 调用名称 | 输出 | 默认分组价格 | 单次文本限制 |
| --- | --- | --- | --- |
| `vox-1` | 一份 MP3 | 每次成功生成约 ¥0.10（USD 0.01369863） | 5000 个加权字符单位 |

汉字 U+4E00–U+9FFF 每字计 2，其余 Unicode 字符每字符计 1。因此纯中文最多 2500 字，纯英文最多 5000 字符，标点和空格也占单位。文本不会截断或自动拆成多个收费任务。输入普通文本即可；文本内情绪标签不解析。

价格按当前汇率 7.3 换算；账户分组倍率及平台显示币种可能不同，以实际账单为准。创建任务预扣一次费用，成功结算、失败退还。限制内字数、语速和情绪不额外增倍。查询状态和重复下载同一份结果不产生新的生成费。

## 先试听，再选择音色

打开[创建语音任务](../api-reference/media-tts/create-speech.md)，可以按语言筛选、搜索名称、播放固定样本，再点击“使用此音色”。选择会同步到代码示例和调试请求。

固定样本试听免费，无需 API Key。自己输入文字生成音频，需要客户 Key，并按正常规则收费。部分音色暂无固定试听，不代表不能选择。

程序可从文档站读取[音色目录](https://xyapi-docs.pages.dev/assets/media-tts/voices.json)。目录包含音色 `id`、适用 `models`、名称、语言、描述和 `preview_url`；没有试听时地址为 `null`。使用目录里的公开 ID，音色只适用于其列出的模型。不同模型的音色、参数和限制以各自目录为准。

## 创建、查询、下载

```bash
curl https://openai.2yanx.dpdns.org/tts/v1/tasks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"vox-1","text":"你好，欢迎使用我们的语音服务。","voice":"vx_dbd27c4a9332","parameters":{"speed":1,"pitch":0,"volume":0,"emotion":"neutral","enhance":true},"output":{"format":"mp3"}}'
```

保存返回的 `id`，每隔 3–5 秒查询一次。收到创建响应只表示任务已接收；终态为 `succeeded` 或 `failed`。客户端断连后，先查询已有任务，避免重复生成和重复收费。

```bash
curl https://openai.2yanx.dpdns.org/tts/v1/tasks/TASK_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

成功后获取产物列表，也可以通过固定的 `audio` 产物键下载。

```bash
curl https://openai.2yanx.dpdns.org/v1/tasks/TASK_ID/artifacts \
  -H "Authorization: Bearer YOUR_API_KEY"
curl https://openai.2yanx.dpdns.org/v1/tasks/TASK_ID/artifacts/audio/content \
  -H "Authorization: Bearer YOUR_API_KEY" -o speech.mp3
```

下载支持 `HEAD` 和 `Range: bytes=0-1023`。使用任务所属账户的客户 Key；分享地址中的访问参数具有凭证作用，请妥善保管。

## 声音参数

| 参数 | 范围 / 默认值 | 用途 |
| --- | --- | --- |
| `speed` | 0.5–2，默认 1 | 语速倍率 |
| `pitch` | 整数 -12–12，默认 0 | 音调控制 |
| `volume` | 整数 0–10，默认 0 | 0 为基础音量，向上增强；0 不是静音 |
| `emotion` | 默认空字符串 | 全文情绪；支持 `happy`、`sad`、`angry`、`fearful`、`disgusted`、`surprised`、`neutral` |
| `enhance` | 布尔值，默认 `true` | 语音增强开关 |

参数放在 `parameters` 对象里，数字使用 JSON 数值，开关使用 JSON 布尔值。情绪效果受音色和文本影响，建议先用短句比较。当前只支持 MP3；不支持的字段、格式或模型音色组合会明确报错。

失败任务的公开错误仅说明任务失败。修正文本、音色或参数后，再创建新任务；临时服务错误可稍后重试，但已有任务必须先查终态。
