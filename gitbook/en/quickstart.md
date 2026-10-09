# Quickstart

Create a customer API Key with sufficient credit and model permissions in the [console](https://openai.2yanx.dpdns.org). `YOUR_API_KEY` below is a placeholder.

## Generate an image

```bash
curl https://openai.2yanx.dpdns.org/v1/images/generations \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-image-2","prompt":"A yellow circle on white","response_format":"url"}'
```

On success, the JSON response contains the image URL in `data[0].url`. To request Base64 instead, explicitly set `response_format:"b64_json"`.

A normal JSON request waits for generation and may reach a proxy timeout. See the [image guide](guides/media-image.md) for production streaming, heartbeats and completion/error handling. Check the original request and consumption before resubmitting after a timeout.

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
