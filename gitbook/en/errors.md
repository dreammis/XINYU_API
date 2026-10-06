# Errors and task recovery

Distinguish a rejected request, a failed backend task, and interrupted delivery.

| Situation | Action |
| --- | --- |
| 400, invalid/conflicting parameters | Correct the request using the capability reference |
| 401 / 403, authentication/permissions | Check the customer key, model access, and account restrictions |
| 429, capacity/rate limit | Wait for capacity; an image request rejected at admission is not submitted |
| 413, upload limit | Reduce the upload or use a readable reference URL |
| Video status `failed` | Read the error; failed tasks follow the refund policy |
| Image SSE `error` | Treat as a failed event and keep request IDs; HTTP 200 does not override it |
| Timeout, 502/504, disconnect | Check the original task and consumption before re-submitting |

Image success requires `image_generation.completed`, `image_edit.completed`, or custom `image_url.completed` when `delivery:"url"` is set. Heartbeats and `[DONE]` alone do not prove success. Decode Base64 or download the URL and verify the result. Preserve `X-Image-Request-Id` and final `request_id` for support.

For videos, poll `queued`/`in_progress`, download `completed`, and handle `failed`. `unknown` is an unrecognized state, not completion or a reason to create a duplicate task.

Inspect the final state and output when receiving Responses `response.completed`. For background Responses, preserve both `resp_...` and `metadata.task_id` for polling and content download.

Read the [image guide](guides/media-image.md) and [video guide](guides/media-video.md) for exact limits.
