// 视频任务适配只连接现有上游；公开模型和结果不包含供应商信息。
const MODELS = ["cogvideo-fast", "cogvideo-pro", "cogvideo-basic", "cogvideo-short"];
const SIZES = {
  "1920x1080": ["1080p", "16:9"], "1080x1920": ["1080p", "9:16"],
  "1080x1080": ["1080p", "1:1"], "1440x1080": ["1080p", "4:3"],
  "1080x1440": ["1080p", "3:4"], "720x1280": ["720p", "9:16"],
};
const RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"];
const KEYS = ["model", "prompt", "seconds", "duration", "size", "resolution", "aspect_ratio",
  "input_reference", "image_url", "reference_images", "generation_mode", "metadata", "n", "sample_count"];
const META_KEYS = ["mode", "resolution", "aspect_ratio", "reference_images", "generation_mode"];

export const meta = {
  apiVersion: 1, key: "media-video", name: "Video Studio", version: "1.0.0",
  author: { name: "Video Studio" }, icon: "text:Video",
  description: { en: "Video generation", zh: "视频生成" },
  models: MODELS, fetchMode: "per_task", auth: "api_key",
  protocols: ["openai_video", { name: "openai_responses", supports: ["stream", "sync", "background"] }],
};

// 同一参数的兼容名称必须一致，避免客户传了参数却被默认值覆盖。
function parameter(input, metadata, key) {
  if (input[key] !== undefined && metadata[key] !== undefined && JSON.stringify(input[key]) !== JSON.stringify(metadata[key])) {
    throw new Error("conflicting video parameter: " + key);
  }
  return input[key] !== undefined ? input[key] : metadata[key];
}

function imageSource(value) {
  if (value && typeof value === "object" && value.__fileRef) return value;
  if (typeof value !== "string" || !/^(https?:\/\/[^\s/]+\/?.*|data:image\/[^;,]+;base64,[A-Za-z0-9+/=\r\n]+)$/.test(value.trim())) {
    throw new Error("images must be HTTP(S) URLs or image Base64 data URLs");
  }
  return value.trim();
}

// 按模型校验实际生成边界；费用按一条固定，不随这些参数乘算。
export function normalizeVideoRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("video request must be an object");
  for (const key of Object.keys(input)) if (!KEYS.includes(key)) throw new Error("unsupported video parameter: " + key);
  if (!MODELS.includes(input.model)) throw new Error("unsupported video model");
  if (typeof input.prompt !== "string" || !input.prompt.trim() || Array.from(input.prompt).length > 4096) {
    throw new Error("prompt must contain 1-4096 characters");
  }
  for (const count of [input.n, input.sample_count]) if (count !== undefined && Number(count) !== 1) throw new Error("only one video per request is supported");
  const metadata = input.metadata === undefined ? {} : input.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw new Error("metadata must be an object");
  for (const key of Object.keys(metadata)) if (!META_KEYS.includes(key)) throw new Error("unsupported video metadata parameter: " + key);
  const short = input.model === "cogvideo-short";
  if (input.seconds !== undefined && input.duration !== undefined && Number(input.seconds) !== Number(input.duration)) throw new Error("seconds and duration conflict");
  const duration = input.seconds !== undefined ? Number(input.seconds) : input.duration !== undefined ? Number(input.duration) : short ? 8 : 5;
  if (!Number.isInteger(duration) || duration < 1 || duration > (input.model === "cogvideo-basic" ? 5 : 10)) throw new Error("unsupported duration for this model");
  const dimensions = input.size === undefined ? undefined : SIZES[input.size];
  if (input.size !== undefined && !dimensions) throw new Error("unsupported video size");
  const requestedResolution = parameter(input, metadata, "resolution");
  const requestedRatio = parameter(input, metadata, "aspect_ratio");
  const resolution = requestedResolution || (dimensions ? dimensions[0] : short ? "720p" : "1080p");
  const aspectRatio = requestedRatio || (dimensions ? dimensions[1] : short ? "9:16" : "16:9");
  if (dimensions && (dimensions[0] !== resolution || dimensions[1] !== aspectRatio)) throw new Error("size conflicts with resolution or aspect_ratio");
  if (resolution !== (short ? "720p" : "1080p") || !RATIOS.includes(aspectRatio)) throw new Error("unsupported resolution or aspect_ratio for this model");
  if (input.input_reference !== undefined && input.image_url !== undefined) throw new Error("input_reference cannot be combined with image_url");
  const single = input.input_reference !== undefined ? input.input_reference : input.image_url;
  const references = parameter(input, metadata, "reference_images");
  if (single !== undefined && references !== undefined) throw new Error("single image cannot be combined with reference_images");
  const mode = references !== undefined ? "reference_to_video" : single !== undefined ? "image_to_video" : "text_to_video";
  if (metadata.mode !== undefined && metadata.mode !== mode) throw new Error("mode does not match the supplied images");
  const generationMode = parameter(input, metadata, "generation_mode");
  if (generationMode !== undefined && mode !== "reference_to_video") throw new Error("generation_mode requires reference_images");
  const body = { model: input.model, prompt: input.prompt, duration, resolution, aspect_ratio: aspectRatio, sample_count: 1 };
  if (references !== undefined) {
    if (!["cogvideo-fast", "cogvideo-pro"].includes(input.model)) throw new Error("this model does not support reference videos");
    if (!Array.isArray(references) || references.length === 0) throw new Error("reference_images must contain at least one image");
    if (duration < 3) throw new Error("reference videos require duration 3-10 seconds");
    body.reference_images = references.map(imageSource);
    body.generation_mode = generationMode === undefined ? "pro_ad" : generationMode;
    if (!["speed", "pro", "pro_ad"].includes(body.generation_mode)) throw new Error("unsupported generation_mode");
  }
  if (single !== undefined) body.image_url = imageSource(single);
  if (short && (duration !== 8 || aspectRatio !== "9:16" || mode !== "text_to_video")) throw new Error("cogvideo-short requires 8 seconds, 720p, 9:16 and text only");
  return { body, action: mode };
}

function decodeVideo(ctx) {
  let input;
  if (ctx.body.kind === "json") input = { ...ctx.body.value, model: ctx.model };
  else if (ctx.body.kind === "multipart") {
    input = { model: ctx.model };
    for (const key of Object.keys(ctx.body.fields)) {
      const values = ctx.body.fields[key];
      if (values.length !== 1) throw new Error("duplicate video parameter: " + key);
      input[key] = key === "metadata" ? JSON.parse(values[0]) : values[0];
    }
    const files = ctx.body.files || [];
    if (files.length > 1) throw new Error("only one input_reference file is supported");
    if (files.length) {
      const file = files[0];
      if (file.field !== "input_reference" || !/^image\//.test(file.mimeType)) throw new Error("input_reference must be an image file");
      if (input.input_reference !== undefined || input.image_url !== undefined) throw new Error("image file cannot be combined with an image URL");
      input.input_reference = { __fileRef: file.ref, encoding: "dataUrl", maxBytes: 20971520 };
    }
  } else throw new Error("video request must be JSON or multipart");
  const normalized = normalizeVideoRequest(input);
  return { kind: "submit", model: ctx.model, action: normalized.action, requestBody: normalized.body };
}

// Responses 的文本与图片输入转换成同一份视频请求，不丢弃多图。
function decodeResponses(ctx) {
  if (ctx.body.kind !== "json") throw new Error("Responses video requests require JSON");
  const req = ctx.body.value;
  const allowed = KEYS.concat(["input", "stream", "background", "store"]);
  for (const key of Object.keys(req)) if (!allowed.includes(key)) throw new Error("unsupported Responses video parameter: " + key);
  const texts = [], images = [];
  if (typeof req.input === "string") texts.push(req.input);
  else if (Array.isArray(req.input)) {
    for (const item of req.input) {
      if (typeof item === "string") { texts.push(item); continue; }
      const content = item && item.content !== undefined ? item.content : [item];
      for (const part of Array.isArray(content) ? content : [content]) {
        if (part && ["input_text", "text"].includes(part.type) && typeof part.text === "string") texts.push(part.text);
        else if (part && ["input_image", "image_url"].includes(part.type)) images.push(imageSource(typeof part.image_url === "object" ? part.image_url.url : part.image_url));
        else throw new Error("unsupported Responses input content");
      }
    }
  } else if (req.input !== undefined) throw new Error("input must be text or a content array");
  const input = { model: ctx.model, prompt: texts.length ? texts.join("\n") : req.prompt };
  if (texts.length && req.prompt !== undefined) throw new Error("input cannot be combined with prompt");
  for (const key of KEYS) if (!["model", "prompt"].includes(key) && req[key] !== undefined) input[key] = req[key];
  if (images.length) {
    if (input.input_reference !== undefined || input.image_url !== undefined || input.reference_images !== undefined || (input.metadata || {}).reference_images !== undefined) throw new Error("input images cannot be combined with other images");
    if (images.length === 1 && (input.metadata || {}).mode !== "reference_to_video") input.input_reference = images[0];
    else input.reference_images = images;
  }
  const normalized = normalizeVideoRequest(input);
  return { kind: "submit", model: ctx.model, action: normalized.action, requestBody: normalized.body };
}

function responseVideo(ctx) {
  const video = (ctx.artifacts || {}).video;
  if (!video || !video.url) throw new Error("video output is unavailable");
  const escaped = video.url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return '<video controls src="' + escaped + '"></video>';
}

export const protocols = {
  openai_video: {
    decodeRequest: decodeVideo,
    render(ctx, task) {
      // 只返回公共字段，不能将上游任务快照、模型或视频原地址透传。
      const status = { NOT_START: "queued", SUBMITTED: "queued", QUEUED: "queued", IN_PROGRESS: "in_progress", SUCCESS: "completed", FAILURE: "failed" }[task.status] || "unknown";
      const result = { id: task.task_id, object: "video", status, progress: Number(String(task.progress || "0").replace("%", "")), created_at: task.created_at };
      if (task.status === "FAILURE") result.error = { code: "video_generation_failed", message: "Video generation failed. Please try another prompt." };
      return result;
    },
  },
  openai_responses: {
    decodeRequest: decodeResponses,
    renderEvents(ctx, task, previous) {
      const state = { status: task.status, progress: task.progress || "0%" };
      if (task.status === "SUCCESS") return { events: previous && previous.status === "SUCCESS" ? [] : [{ type: "output", data: responseVideo(ctx) }], state, done: true };
      if (task.status === "FAILURE") return { events: [{ type: "error", code: "video_generation_failed", message: "Video generation failed. Please try another prompt." }], state, done: true };
      if (previous && previous.status === state.status && previous.progress === state.progress) return { events: [], state, done: false };
      return { events: [{ type: "progress", message: task.status === "IN_PROGRESS" ? "generating video" : "video queued", progress: Number(String(state.progress).replace("%", "")) }], state, done: false };
    },
    renderFinal(ctx) {
      return { output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: responseVideo(ctx), annotations: [], logprobs: [] }] }] };
    },
  },
};

export function buildSubmitRequest(ctx) {
  return { url: ctx.baseUrl.replace(/\/$/, "") + "/v1/videos", method: "POST",
    headers: { Authorization: ctx.authHeader, "Content-Type": "application/json" },
    body: { ...ctx.requestBody, model: ctx.upstreamModel || ctx.model } };
}

export function parseSubmitResponse(ctx, response) {
  const body = response.body;
  if (!body || typeof body.id !== "string" || !body.id || !["queued", "processing", "in_progress"].includes(body.status)) throw new Error("video service returned an invalid task");
  return { taskId: body.id, taskData: { status: body.status } };
}

export function buildQueryRequest(ctx) {
  return { url: ctx.baseUrl.replace(/\/$/, "") + "/v1/videos/" + encodeURIComponent(ctx.taskId), method: "GET", headers: { Authorization: ctx.authHeader } };
}

export function parseTaskResult(ctx, body) {
  const status = { queued: "QUEUED", processing: "IN_PROGRESS", in_progress: "IN_PROGRESS", completed: "SUCCESS", failed: "FAILURE" }[(body || {}).status];
  if (!status) return { status: "UNKNOWN", reason: "Video task status is unavailable." };
  if (status === "FAILURE") return { status, reason: "Video generation failed. Please try another prompt." };
  if (status === "SUCCESS" && !videoURL({ data: body })) return { status: "UNKNOWN", reason: "Video output is unavailable." };
  return { status, progress: status === "SUCCESS" ? "100%" : Math.max(0, Math.min(99, Number(body.progress) || 0)) + "%" };
}

// 产物地址只供宿主下载代理使用，公开结果不携带供应商 URL。
function videoURL(ctx) {
  const body = ctx.data || {};
  return Array.isArray(body.data) && body.data.length === 1 && typeof body.data[0].url === "string" && /^https?:\/\//.test(body.data[0].url) ? body.data[0].url : "";
}

export function listArtifacts(task) {
  return task.status === "SUCCESS" && videoURL(task) ? [{ key: "video", type: "video", mimeType: "video/mp4" }] : [];
}

export function buildContentRequest(ctx) {
  if (ctx.artifactKey !== "video" || !videoURL(ctx)) throw new Error("artifact_not_found");
  return { url: videoURL(ctx), method: ctx.clientRequest.method, credentialless: true };
}

// 返回 null 使宿主沿用每次 ModelPrice，不按秒数或清晰度增加倍率。
export function extractUsage() { return null; }
