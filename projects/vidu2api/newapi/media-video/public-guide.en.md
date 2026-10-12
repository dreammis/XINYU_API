# Videos

Use `https://openai.2yanx.dpdns.org` with `Authorization: Bearer YOUR_API_KEY`. Use a customer key from the console, not an administrator token. Production clients should use asynchronous tasks or Responses SSE for long video requests.

## Model capabilities

| Model | Text | Single image | Multiple references | Duration | Default size |
| --- | --- | --- | --- | --- | --- |
| `cogvideo-fast` | Yes | Yes | Yes | Text/image 1–10s, reference 3–10s; default 5s | 1920×1080 |
| `cogvideo-pro` | Yes | Yes | Yes | Text/image 1–10s, reference 3–10s; default 5s | 1920×1080 |
| `cogvideo-basic` | Yes | Yes | No | 1–5s; default 5s | 1920×1080 |
| `cogvideo-short` | Yes | No | No | Exactly 8s | 720×1280 |

These are site product aliases. The `cogvideo` prefix does not assert generation with open-source CogVideo weights.

Default-group pricing is USD 0.04109589 per successful video, approximately CNY 0.30 at the site's current conversion. Each request produces one video; duration, resolution, and generation mode do not add a multiplier. Submission reserves credit, failed tasks are refunded, and invalid parameters do not charge. Other groups follow current console pricing and group multipliers.

## Create, poll, and download

```bash
curl https://openai.2yanx.dpdns.org/v1/videos \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model":"cogvideo-fast","prompt":"A red paper boat drifting on a quiet pond","seconds":"5","size":"1920x1080"}'
```

```json
{"id":"task_EXAMPLE","object":"video","status":"queued","progress":0,"created_at":1790980000}
```

Save `id`. Poll every 3–5 seconds with a customer key belonging to the task owner:

```bash
curl https://openai.2yanx.dpdns.org/v1/videos/task_EXAMPLE \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

Normal states are `queued`, `in_progress`, `completed`, and `failed`. Failed tasks carry `video_generation_failed`. An unrecognized task state may appear as `unknown`; it does not indicate completion. This endpoint returns status, not a `data[0].url` download result.

After `completed`, download the video:

```bash
curl https://openai.2yanx.dpdns.org/v1/videos/task_EXAMPLE/content \
  -H 'Authorization: Bearer YOUR_API_KEY' -o video.mp4
```

The content endpoint supports HEAD and byte Range requests.

## Request parameters

`model` and a non-blank `prompt` (1–4096 characters) are required. `seconds` accepts an integer or integer string, within the chosen model's limits. Fast/Pro/Basic sizes: `1920x1080`, `1080x1920`, `1080x1080`, `1440x1080`, `1080x1440`; Short only accepts `720x1280`. Read actual encoded dimensions from the downloaded file.

Use `input_reference` for a single image URL, image data URL, or multipart file. Multipart accepts one image file up to 20 MiB; overall request limits also apply. Short does not support image inputs.

Multiple references are available on Fast/Pro only:

```json
{
  "model": "cogvideo-pro",
  "prompt": "The red paper boat from [@图1] and the yellow boat from [@图2] drift side by side",
  "seconds": "5",
  "metadata": {
    "mode": "reference_to_video",
    "reference_images": ["https://example.com/red.png", "https://example.com/yellow.png"],
    "generation_mode": "pro_ad"
  }
}
```

`metadata.mode`, when present, must match supplied inputs: `text_to_video`, `image_to_video`, or `reference_to_video`. Reference mode uses `speed`, `pro`, or `pro_ad` (default) and requires 3–10 seconds. Reference order controls the `[@图N]` prompt references.

Compatibility aliases: `duration` means `seconds`; `image_url` means `input_reference`; `reference_images` and `generation_mode` can appear at top level; `resolution`/`aspect_ratio` can replace `size` and may also appear in `metadata`. Duplicate representations must agree. Single-image and reference-image inputs cannot be mixed. `n` and `sample_count` only accept 1. Unknown fields are rejected. Start/end frames, extension, remix, and multiple outputs are unavailable.

## Stream progress with Responses

`POST /v1/responses` uses `input` for text and the same video parameters:

```bash
curl -N https://openai.2yanx.dpdns.org/v1/responses \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model":"cogvideo-fast","input":"A red paper boat drifting on a pond","seconds":"5","stream":true}'
```

The SSE stream reports progress, outputs an HTML video element with the final link, and terminates with `response.completed`. It does not stream unfinished video frames. Check the final response state and output before treating the request as successful.

Structured input also accepts message content with text and images:

```json
{
  "model": "cogvideo-fast",
  "stream": true,
  "input": [{"role":"user","content":[
    {"type":"input_text","text":"Animate this paper boat on a quiet pond"},
    {"type":"input_image","image_url":"https://example.com/boat.png"}
  ]}]
}
```

## Background Responses

Set `background:true` to receive a `resp_...` ID immediately. Poll `GET /v1/responses/{response_id}`. The response's `metadata.task_id` can be used with `/v1/videos/{task_id}/content`.

Successful `output[].content[].text` contains `<video controls src="PRIVATE_SHARE_URL"></video>`. Protect this URL like a private file sharing credential. Re-querying may generate a new sharing link. Authenticated content download is also available with the owning customer's key.

Without `stream` or `background`, the HTTP request waits for completion. A proxy may disconnect while the backend still completes and charges, so use asynchronous tasks or SSE and investigate the existing task before resubmitting.

These video parameters and outputs are site extensions. Clients supporting only `/v1/chat/completions` cannot directly use these video models.
