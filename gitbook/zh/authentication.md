# 鉴权

所有生成、查询和下载接口使用客户 API Key：

```http
Authorization: Bearer YOUR_API_KEY
```

在[控制台](https://openai.2yanx.dpdns.org)创建密钥，并确认模型权限和额度。管理令牌用于管理后台，不能当作客户生成密钥使用。

普通 HTTP 请求的 Base URL 是 `https://openai.2yanx.dpdns.org`。使用 OpenAI SDK 时，Base URL 包含 `/v1`：

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openai.2yanx.dpdns.org/v1",
    api_key="YOUR_API_KEY",
    max_retries=0,
)
```

这里关闭 SDK 的自动重试，是为了避免长任务连接中断后重复提交、重复产生费用。先查询已有任务或核对消费记录，再做显式重试。

任务查询和内容下载必须使用任务所属账户的客户密钥。结果里的私有视频分享链接自带访问权限，应像密钥一样妥善保存。
