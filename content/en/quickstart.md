# Quickstart

Create a customer API Key with sufficient credit and model permissions in the [console](https://openai.2yanx.dpdns.org). `YOUR_API_KEY` below is a placeholder.

## Generate an image

```bash
curl -N https://openai.2yanx.dpdns.org/v1/images/generations \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-image-2","prompt":"A yellow circle on white","stream":true,"delivery":"url"}'
```

Wait for `image_url.completed` and download the returned `url`. This is a site-specific URL event requiring custom client handling. HTTP 200 alone does not prove generation succeeded; handle `error` events.

For SDK-compatible Base64 SSE, omit `delivery`. See the [image guide](guides/media-image.md).

## Generate a video

```bash
curl https://openai.2yanx.dpdns.org/v1/videos \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model":"cogvideo-fast","prompt":"A red paper boat drifting on a quiet pond","seconds":"5","size":"1920x1080"}'
```

Save the returned task `id` and poll every 3–5 seconds:

```bash
curl https://openai.2yanx.dpdns.org/v1/videos/task_EXAMPLE \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

After `completed`, download:

```bash
curl https://openai.2yanx.dpdns.org/v1/videos/task_EXAMPLE/content \
  -H 'Authorization: Bearer YOUR_API_KEY' -o video.mp4
```

The query returns status; `/content` returns the file. See the [video guide](guides/media-video.md) for references and streaming.
