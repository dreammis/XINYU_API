# Images

Use your customer API Key at `https://openai.2yanx.dpdns.org`. Send `Authorization: Bearer YOUR_API_KEY`. Long requests should use SSE so the connection receives heartbeats while generation is pending.

Image contract version: **1.2.0**. Add the site extension `progress:true` together with `stream:true` to receive `image_generation.progress` or `image_edit.progress` before completion. Both JSON and multipart support it; form booleans use `true`/`false`. Progress defaults to false, preserving completion-only SDK streams.

```bash
curl -N https://openai.2yanx.dpdns.org/v1/images/generations \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-image-2","prompt":"A yellow circle on white","resolution":"4k","aspect_ratio":"16:9","stream":true,"progress":true,"delivery":"url"}'
```

```text
event: image_generation.progress
data: {"type":"image_generation.progress","stage":"generating","percent":null,"percent_source":null,"request_id":"REQUEST_ID"}
```

Stages are `queued` (accepted or queued), `preparing` (including references), `generating`, `fetching` (reading the generated original), `uploading` (owned storage), and `delivering` (preparing the final response). `unavailable` means progress observation is temporarily unavailable; generation and heartbeats continue. `failed` describes a failed generation task; check the final error event.

`percent` is a number from 0 to 100 only when the source explicitly supplies a numeric value, with `percent_source:"upstream"`; otherwise both are null. It describes source generation progress, not total download/upload/delivery progress, and is not guaranteed for every model. No percentages or previews are fabricated. Changes are sampled approximately once per second, so short stages may be skipped. Do not depend on a fixed sequence. With progress enabled, all progress/final/error events share the same public `request_id`. A generation percentage of 100 or a `delivering` stage is not successful delivery: wait for the final completed event.

This is a custom event requiring client handling. With OpenAI Python SDK, add `"progress": True` to `extra_body` and handle `event.type` explicitly; a client UI will not display custom events automatically. Strict original-provider event clients can keep progress disabled. Progress works with URL and Base64 final delivery. Observation failure never resubmits generation or causes another charge.

Some SDK versions construct custom events using an existing image event class while preserving `type`, `stage`, and `percent`. Check `event.type`; do not rely solely on the Python class name or `isinstance`.

## Generate an image

```bash
curl -N https://openai.2yanx.dpdns.org/v1/images/generations \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-image-2","prompt":"A yellow circle on a white background","resolution":"4k","aspect_ratio":"16:9","stream":true,"delivery":"url"}'
```

With the site extension `delivery:"url"`, the final event is `image_url.completed`. Download the image from the returned URL. This event requires custom client handling.

```text
event: image_url.completed
data: {"type":"image_url.completed","operation":"generate","created_at":1790980000,"url":"https://s3.yanxinyu.ggff.net/media_outputs/0123456789abcdef0123456789abcdef.png","request_id":"REQUEST_ID"}

data: [DONE]
```

Omit `delivery` for the default SSE event: `image_generation.completed`, containing `b64_json`, actual `size`, `output_format`, `created_at`, `url`, and `request_id`. Even `response_format:"url"` retains Base64 in this default SSE mode. `delivery:"url"` requires `stream:true` and cannot be combined with `response_format:"b64_json"`.

## Models and fixed quality

| Model | Fixed quality |
| --- | --- |
| `gemini-3.1-flash-lite-image` | `standard`; 1K only |
| `gemini-3.1-flash-image` | `standard` |
| `gemini-3-pro-image` | `hd` |
| `gpt-image-2.5-fast` | `standard` |
| `gpt-image-2.5-pro` | `hd` |
| `gpt-image-2` | `hd` |
| `image-basic` | `standard` |
| `image-fast` | `standard` |
| `image-pro` | `hd` |
| `image-creative` | `hd` |

These are public product route names. Names do not guarantee an original-provider connection or a precise model snapshot. `gpt-image-2.5-fast` and `gpt-image-2.5-pro` are site product names, not verified official OpenAI model IDs.

## Parameters and output dimensions

`model` and a non-blank `prompt` are required. Prompts accept at most 4096 Unicode characters. `n` is always 1; `enhance` defaults to true. `quality` may be omitted, `auto`, or the fixed value for that model. `low`, `medium`, and `high` are rejected.

`resolution` accepts `1k`, `1080p`, `2k`, `4k`, case-insensitively; default 1K. Lite rejects 2K/4K before submission. `aspect_ratio` defaults to `1:1` and accepts `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `21:9`.

`size` accepts `auto` or these tier/ratio presets:

| Tier | Presets |
| --- | --- |
| 1K | `1024x1024`, `1536x1024`, `1024x1536`, `1792x1024`, `1024x1792` |
| 2K | `2048x2048`, `2048x1152`, `1152x2048` |
| 4K | `4096x4096`, `4096x2304`, `2304x4096` |

Explicit `size`, `resolution`, and `aspect_ratio` must agree. A preset selects a tier and ratio, not a guaranteed exact pixel resize. Recorded square 4K results: Flash/Pro returned 4096×4096; the three GPT Image routes and Basic returned 2880×2880. Recorded 4K 16:9 results for the GPT routes and Basic were 3840×2160. Basic square 1K/2K returned 1440×1440 / 1920×1920. Read dimensions from the actual output.

`image_url` accepts one HTTP(S) URL or Base64 image data URL; `reference_images` accepts a non-empty array of those sources. They are mutually exclusive. These, `resolution`, `aspect_ratio`, `enhance`, and `delivery` are site extensions, not universally supported original-provider fields.

Unknown fields are rejected. Masks, transparent-background control, output format/compression control, moderation, input fidelity, seed, style, and user fields are unavailable.

## Edit with reference images

`POST /v1/images/edits` accepts JSON or multipart. JSON uses `image`, containing one source or an array:

```json
{
  "model": "gemini-3-pro-image",
  "prompt": "Keep the composition and change red to blue",
  "image": ["https://example.com/reference.png"],
  "stream": true,
  "partial_images": 0
}
```

Multipart accepts `image` or repeated `image[]` files, at most 20 MiB per file. Boolean form fields are `true`/`false`. At least one reference is required; masks are unavailable. The default SSE completion event is `image_edit.completed`. With `delivery:"url"`, the event is `image_url.completed` and `operation` is `edit`.

## Non-streaming results and SDK

Without `stream:true`, omitted `response_format` returns an owned storage URL. Explicit `b64_json` adds Base64 to the successful JSON result. Decode the actual image format; output may be PNG or JPEG.

```json
{"created":1790980000,"data":[{"url":"https://s3.yanxinyu.ggff.net/media_outputs/0123456789abcdef0123456789abcdef.png","b64_json":"BASE64_IMAGE"}]}
```

OpenAI Python SDK default SSE parsing works with site parameters in `extra_body`:

```python
import base64
from pathlib import Path
from openai import OpenAI

client = OpenAI(base_url="https://openai.2yanx.dpdns.org/v1", api_key="YOUR_API_KEY", max_retries=0)
events = client.images.generate(
    model="gpt-image-2", prompt="A yellow circle on white",
    stream=True, partial_images=0,
    extra_body={"resolution": "4k", "aspect_ratio": "16:9"},
)
for event in events:
    if event.type == "image_generation.completed":
        Path("result." + event.output_format).write_bytes(base64.b64decode(event.b64_json))
```

Token `usage` is omitted because billing is per image. Strict consumers requiring original token usage must support its absence. `quality:"auto"` in the completion event does not assert an unverified original-provider quality tier.

## Completion, errors, and capacity

SSE sends comment heartbeats while waiting, then a completion event or an `error` event. No intermediate previews are available; `partial_images` only accepts 0. HTTP 200 alone does not confirm generation success.

The entry admits up to 20 requests, including waiting and delivery; that does not mean 20 images generate concurrently. Excess requests receive 429 before generation submission. Non-streaming long requests can still encounter proxy timeouts.

A disconnected client does not cancel an already submitted generation. Do not automatically re-submit after a timeout or delivery error. Preserve `X-Image-Request-Id` or the final event's `request_id`, and check consumption with support first.
