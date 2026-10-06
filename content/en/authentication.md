# Authentication

Generation, polling, and downloads use a customer API Key:

```http
Authorization: Bearer YOUR_API_KEY
```

Create a key in the [console](https://openai.2yanx.dpdns.org), with the required model permissions and credit. Administrator tokens cannot be used as customer generation keys.

HTTP Base URL: `https://openai.2yanx.dpdns.org`. OpenAI SDK Base URL includes `/v1`:

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openai.2yanx.dpdns.org/v1",
    api_key="YOUR_API_KEY",
    max_retries=0,
)
```

Disable automatic retries for long generation requests to avoid duplicate submissions after a disconnect. Check the original task or consumption record before explicitly retrying.

Poll and download with a customer key belonging to the task owner. Treat private video sharing URLs as access credentials.
