# 创建语音任务

`POST /tts/v1/tasks`

一次请求生成一份 MP3。默认分组每次成功生成约 ¥0.10（USD 0.01369863，换算汇率 7.3）；限制内字数不增倍。失败退还预扣。先保存任务 ID，再查询。

[调用指南与限制](../../guides/media-tts.md)

{% openapi src="https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json?version=a8a88a1076a1c43d" path="/tts/v1/tasks" method="post" %}
https://raw.githubusercontent.com/dreammis/XINYU_API/master/gitbook/openapi/media-tts.json?version=a8a88a1076a1c43d
{% endopenapi %}

## application/json

| 参数 | 类型 | 必填 | 默认值 / 可选值 | 说明 |
| --- | --- | --- | --- | --- |
| `model` | string | 是 | vox-1 |  |
| `text` | string | 是 | — | 普通文本，最多 5000 个加权字符单位：U+4E00–U+9FFF 汉字计 2，其余 Unicode 字符计 1。不截断、不拆单；文本内情绪标签不解析，请使用 emotion 参数。 |
| `voice` | string | 是 | — | 从文档音色库选择音色 ID；音色只能用于目录中标明的模型。 |
| `parameters` | object | 否 | — |  |
| `output` | object | 否 | — |  |

### 请求示例

```json
{
  "model": "vox-1",
  "text": "你好，欢迎使用我们的语音服务。",
  "voice": "vx_dbd27c4a9332",
  "parameters": {
    "speed": 1,
    "pitch": 0,
    "volume": 0,
    "emotion": "neutral",
    "enhance": true
  },
  "output": {
    "format": "mp3"
  }
}
```

## 响应

| Status | Description |
| --- | --- |
| 200 | JSON response |
| 400 | JSON response |
| 401 | JSON response |
| 404 | JSON response |
| 429 | JSON response |
| 503 | JSON response |

### application/json

```json
{
  "id": "task_EXAMPLE",
  "model": "vox-1",
  "status": "queued"
}
```
