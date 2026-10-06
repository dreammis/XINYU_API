# Billing

Current credit, group multipliers, model access, and consumption records are available in the [console](https://openai.2yanx.dpdns.org).

| Capability | Billing | Notes |
| --- | --- | --- |
| Images | Successful image count and resolution tier | One image per request; Lite supports 1K only; see console for current prices |
| Videos | Successful video count | One video per request; current public prices and model limits are in the video guide |

Current video duration, resolution, and mode do not add price multipliers. Other groups use their configured multipliers. Submission reserves credit; failed video tasks are refunded. Invalid parameters do not charge. See the [video guide](guides/media-video.md).

Image completion events omit original-provider token `usage` because billing is per image. Missing token usage does not mean a request is free.

A timeout, 502/504, or disconnect may leave a successful, charged backend task. Preserve task/request IDs and check existing tasks and consumption before submitting again.
