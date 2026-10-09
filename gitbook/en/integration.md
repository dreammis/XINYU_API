# Get started

Create a customer key, complete one request, then choose the right flow for your application.

## Make your first request

1. Create a customer API Key in the [console](https://openai.2yanx.dpdns.org), with credit and permission for the selected model.
2. Follow the [quickstart](quickstart.md) to generate an image or create, poll and download a video.
3. Use the [model center](models.md) to find public route names and their limits.

## Configure your client

The HTTP base URL is `https://openai.2yanx.dpdns.org`. SDKs that require a `/v1` prefix use `https://openai.2yanx.dpdns.org/v1`. For direct HTTP requests use the endpoint's full path without adding `/v1` twice.

Authenticate with `Authorization: Bearer YOUR_API_KEY`. Each endpoint specifies its support for JSON, multipart uploads, streaming and background tasks.

## Choose a request flow

- Start with a normal JSON image request; see the [image guide](guides/media-image.md) for long-request streaming events.
- For video, create a task, poll its status, then download its result. See the [video guide](guides/media-video.md).
- Confirm your client supports the endpoint and response format. A chat-only client cannot directly replace an image or video client.

## Next steps

- [Authentication](authentication.md)
- [Billing and failures](billing.md)
- [Errors and task recovery](errors.md)
- [FAQ](faq.md)
