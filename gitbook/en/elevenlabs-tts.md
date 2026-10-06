# ElevenLabs text-to-speech (existing documentation)

> This page preserves the existing New API integration documentation. The current gateway response has not been verified again: the old customer documentation describes a JSON audio link, while the current `dreammis/sync2tts` source returns binary audio. Confirm the deployed gateway response and billing configuration before integrating. An executable OpenAPI contract is pending this verification.

## Authentication and endpoint

Create a customer API key in the [gateway console](https://openai.2yanx.dpdns.org). Send `Authorization: Bearer YOUR_API_KEY` and `Content-Type: application/json` to `POST https://openai.2yanx.dpdns.org/v1/audio/speech`.

## Request parameters

| Parameter | Type | Required | Existing documented behavior |
| --- | --- | --- | --- |
| `model` | string | yes | `eleven_v3` |
| `input` | string | yes | Text to synthesize, at most 5000 characters |
| `response_format` | string | no | `mp3`, the only documented format |
| `voice_id` | string | no | Voice ID override; omission uses the configured default |
| `stability` | number | no | Between 0 and 1 |
| `similarity_boost` | number | no | Between 0 and 1 |

## Example

```bash
curl 'https://openai.2yanx.dpdns.org/v1/audio/speech' \
  --header "Authorization: Bearer $XY_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{"model":"eleven_v3","input":"Hello world","response_format":"mp3"}'
```

The existing customer documentation records this JSON response:

```json
{
  "audio_url": "https://public-tts.2yanx.dpdns.org/newapi-tts-temp/...",
  "usage": {"prompt_tokens": 27, "completion_tokens": 0, "total_tokens": 27}
}
```

For that response, fetch `audio_url` to download or play the MP3 file. If the deployed gateway returns `audio/mpeg` instead, save the response body as audio directly. The exact response must be confirmed with the gateway operator; the upstream source alone does not establish the customer contract.

## Errors and audio sample

The existing documentation records errors as `{"detail":"Error details"}`, including invalid keys, unknown model IDs, excessive input length, and upstream generation failures. Gateway errors can also follow the [common gateway error format](errors.md).

[Download the existing audio sample](https://raw.githubusercontent.com/dreammis/XINYU_API/master/docs/public/q.mp3).
