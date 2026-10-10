---
description: One entry for images, videos, speech, and more services.
---

# Welcome to XY API

XY API provides a common gateway, customer keys, and consumption records. Use different capabilities with the same account; each capability defines its own parameters and results.

Base URL: `https://openai.2yanx.dpdns.org`. Create a customer API Key in the [console](https://openai.2yanx.dpdns.org).

{% content-ref url="quickstart.md" %}
[quickstart.md](quickstart.md)
{% endcontent-ref %}

{% content-ref url="capabilities.md" %}
[capabilities.md](capabilities.md)
{% endcontent-ref %}

| Need | Endpoint | Result |
| --- | --- | --- |
| Generate images | `POST /v1/images/generations` | URL / Base64; optional SSE heartbeats |
| Edit with references | `POST /v1/images/edits` | URL / Base64; JSON or file uploads |
| Generate videos | `POST /v1/videos` | Task ID, polling, and completed-file download |
| Stream video progress | `POST /v1/responses` with `stream:true` | Progress and a final video link |
| Background video request | `POST /v1/responses` with `background:true` | Response ID for later polling |
| Synthesize speech | `POST /tts/v1/tasks` | Task ID, polling and MP3 download; [voices and guide](guides/media-tts.md) |

Use asynchronous tasks or SSE for long requests. A disconnected client does not prove the backend stopped or no charge occurred. Check existing tasks and consumption before re-submitting.

See the [model catalog](models.md) for public product names and capability guides.
