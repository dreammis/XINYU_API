# ElevenLabs 语音合成 (TTS)（原有文档）

> 此页保留原文档仓库对已接入 New API 的说明。尚未重新验收当前网关响应：原文档记录 JSON 音频链接，而源工程 dreammis/sync2tts 当前代码返回音频二进制。接入前请确认网关实际响应与计费配置；此页暂不提供可执行 OpenAPI 规范。

当前端点提供强大的 ElevenLabs 语音合成服务接口。它能够将输入的文本高拟真地转换为真人般自然的 MP3 格式音频。

## 🎧 音色效果预览

您可以直接在此试听生成的音频效果：

[下载试听音频](https://raw.githubusercontent.com/dreammis/XINYU_API/master/docs/public/q.mp3)

> **提示**：这是基于我们后台实际生成的音频效果展示。

## 🔑 获取 API 密钥

在正式调用接口前，必须先获取专属的 API Key（密钥）。
- 请前往我们的网关控制台：**[https://openai.2yanx.dpdns.org](https://openai.2yanx.dpdns.org)**。
- 登录后，在“秘钥管理”或者“API Keys”等页面中，生成一个您的专属凭证。
- 在调用时，通过请求头传入 `Authorization: Bearer sk-xxx` 格式即可。

## 📍 核心信息

- **请求方式**: `POST`
- **上线地址**: `https://openai.2yanx.dpdns.org/v1/audio/speech`
- **认证方式**: 在 Header 中携带您的 Bearer Token
- **Content-Type**: `application/json`

## 📦 请求参数

| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `model` | string | 是 | 模型 ID，当前固定传: `eleven_v3` |
| `input` | string | 是 | 要合成的文本，**最大支持 5000 字，超过该长度限制将会直接报错**返回失败。 |
| `response_format` | string | 否 | 输出格式，当前默认且仅支持 `mp3` |
| `voice_id` | string | 否 | 自定义音色 ID。传入则使用该特定音色。您可以前往 [ElevenLabs 官网 (Voices)](https://elevenlabs.io/) 的语音库挑选您心仪的音色并在该特定音色的详情中获取 ID。不传此项则使用默认系统音色。 |
| `stability` | number | 否 | 稳定度，控制语气波动（范围 `0.0 - 1.0`） |
| `similarity_boost` | number | 否 | 音色相似度增强（范围 `0.0 - 1.0`） |

## 📥 响应结构

调用成功后，接口响应格式为 JSON 数据，其中包含生成的音频下载直链以及 Token 消耗统计信息。

```json
{
  "audio_url": "https://public-tts.2yanx.dpdns.org/newapi-tts-temp/...",
  "usage": {
    "prompt_tokens": 27,
    "completion_tokens": 0,
    "total_tokens": 27
  }
}
```

| 参数名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `audio_url` | string | 生成的 MP3 音频文件下载直链。需客户端请求该链接下载或在线播放。 |
| `usage.prompt_tokens` | integer | 输入文本转化为 Token 系统后记录的字符数。 |
| `usage.completion_tokens` | integer | 合成消耗输出，对 TTS 模型来说始终为 `0`。 |
| `usage.total_tokens` | integer | 该次调用的总消耗 Token 统计。 |

## 💡 开发示例

下面提供各主流方式的调用样例（已自动替换为您提供的服务器地址）：

### 1. cURL

```bash
curl --location 'https://openai.2yanx.dpdns.org/v1/audio/speech' \
  --header 'Authorization: Bearer sk-xxx' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "eleven_v3",
    "input": "This is a custom voice demo.",
    "response_format": "mp3",
    "voice_id": "V33LkP9pVLdcjeB2y5Na",
    "stability": 0.4,
    "similarity_boost": 0.7
  }'
```

### 2. Python (Requests)

```python
import requests

url = "https://openai.2yanx.dpdns.org/v1/audio/speech"
headers = {
    "Authorization": "Bearer sk-your-key",
    "Content-Type": "application/json",
}
payload = {
    "model": "eleven_v3",
    "input": "This is a custom voice demo.",
    "response_format": "mp3",
    "voice_id": "V33LkP9pVLdcjeB2y5Na",
    "stability": 0.4,
    "similarity_boost": 0.7,
}

response = requests.post(url, headers=headers, json=payload, timeout=120)
response.raise_for_status()

# 解析 JSON 响应
data = response.json()
print("音频下载链接:", data.get("audio_url"))
print("Token 消耗:", data.get("usage", {}).get("total_tokens"))

# 如需将音频下载到本地使用：
audio_response = requests.get(data["audio_url"])
with open("speech.mp3", "wb") as f:
    f.write(audio_response.content)
```

### 3. Node.js (Fetch)

```javascript
const response = await fetch("https://openai.2yanx.dpdns.org/v1/audio/speech", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sk-your-key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "eleven_v3",
    input: "This is a custom voice demo.",
    response_format: "mp3",
    voice_id: "V33LkP9pVLdcjeB2y5Na",
    stability: 0.4,
    similarity_boost: 0.7,
  }),
});

if (!response.ok) {
  const err = await response.json();
  throw new Error(`Request failed: ${err.detail || response.statusText}`);
}

// 解析 JSON 响应
const data = await response.json();
console.log("音频下载链接:", data.audio_url);
console.log("Token 消耗:", data.usage.total_tokens);

// 若需将音频下载到本地：
// const audioRes = await fetch(data.audio_url);
// const audioBuffer = await audioRes.arrayBuffer();
// const fs = require("fs");
// fs.writeFileSync("speech.mp3", Buffer.from(audioBuffer));
```

## 🚨 常见错误响应

所有业务发生错误时，将返回类似下方的 JSON 结构：

```json
{
  "detail": "错误详情信息"
}
```
- **请求触发字数限制错误**：当 `input` 值超过 5000 字符限制时触发。
- **"Missing/Invalid API key"**：鉴权不合法或 Token 无效。
- **"Model 'not-real' not found"**：传入的模型不存在。
- **"TTS generation failed"**：上游服务端生成出错。

