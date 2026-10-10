# Text to speech and voice samples

Vox 1 creates one MP3 from text for narration, announcements and everyday reading. Its own task API supports voice selection, speaking speed, pitch, volume, emotion and enhancement.

## Model and pricing

| Route | Output | Default-group price | Text limit per task |
| --- | --- | --- | --- |
| `vox-1` | One MP3 | USD 0.01369863, approximately CNY 0.10 per successful generation | 5000 weighted character units |

Han characters in U+4E00–U+9FFF count as two units; all other Unicode code points count as one, including punctuation and spaces. This permits up to 2500 Han characters or 5000 English characters. Text is never truncated or automatically split into separately billed tasks. Send plain text; inline emotion markup is not interpreted.

The CNY estimate uses an exchange rate of 7.3. Account group multipliers and display currency may differ; consult your actual bill. Creation reserves one generation fee. Success settles it and failure refunds it. Text length within the limit and sound parameters do not multiply the charge. Status queries and repeated downloads do not create new generation charges.

## Listen and choose a voice

Open [Create a speech task](../api-reference/media-tts/create-speech.md), filter by language, search voices and play fixed samples. Selecting a voice updates the code example and the playground request.

Fixed sample playback is free and requires no API key. Synthesizing your own text requires a customer key and normal billing. Some voices have no fixed sample.

Applications may read the [voice catalog](https://xyapi-docs.pages.dev/assets/media-tts/voices.json). It lists public `id`, supported `models`, name, language, description and `preview_url`, which is `null` when no sample is available. Voice IDs are scoped to their listed models. Each model defines its own controls and limits.

## Create, poll and download

```bash
curl https://openai.2yanx.dpdns.org/tts/v1/tasks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"vox-1","text":"Hello, welcome to our speech service.","voice":"vx_dbd27c4a9332","parameters":{"speed":1,"pitch":0,"volume":0,"emotion":"neutral","enhance":true},"output":{"format":"mp3"}}'
```

Save the returned `id` and poll every 3–5 seconds. Creation acknowledges acceptance; the terminal states are `succeeded` and `failed`. After a client disconnect, query the existing task before submitting again.

```bash
curl https://openai.2yanx.dpdns.org/tts/v1/tasks/TASK_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
curl https://openai.2yanx.dpdns.org/v1/tasks/TASK_ID/artifacts \
  -H "Authorization: Bearer YOUR_API_KEY"
curl https://openai.2yanx.dpdns.org/v1/tasks/TASK_ID/artifacts/audio/content \
  -H "Authorization: Bearer YOUR_API_KEY" -o speech.mp3
```

Download after success using the task owner's customer key. The audio artifact key is `audio`. Downloads support `HEAD` and byte ranges. Access parameters in share URLs act as credentials.

## Sound controls

| Parameter | Range / default | Meaning |
| --- | --- | --- |
| `speed` | 0.5–2 / 1 | Speaking speed multiplier |
| `pitch` | Integer -12–12 / 0 | Pitch control |
| `volume` | Integer 0–10 / 0 | Zero retains baseline volume; higher values increase it. Zero is not mute. |
| `emotion` | Empty string by default | Applies to the full text: `happy`, `sad`, `angry`, `fearful`, `disgusted`, `surprised`, `neutral` |
| `enhance` | Boolean / `true` | Speech enhancement switch |

Put controls inside `parameters`. Use JSON numbers and booleans. Perceived emotion varies with the voice and text, so compare short samples first. Only MP3 is supported. Unknown fields, formats and unsupported voices produce an explicit error.

Correct the input before creating a replacement for a failed task. For a temporary service error, retry later after checking any existing task's terminal state.
