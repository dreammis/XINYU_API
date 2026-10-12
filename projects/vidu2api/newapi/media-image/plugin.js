// 独立图片协议适配：仅使用已有生图接口，不改变上游业务代码。
const MODELS = [
  "gemini-3.1-flash-lite-image", "gemini-3.1-flash-image", "gemini-3-pro-image",
  "gpt-image-2.5-fast", "gpt-image-2.5-pro", "gpt-image-2",
  "image-basic", "image-fast", "image-pro", "image-creative",
];
// 映射仅用于插件出站请求；宿主渠道不要配置 model_mapping，避免客户日志泄露内部编号。
const UPSTREAM_MODELS = {
  "gemini-3.1-flash-lite-image": "3.2_lite_m",
  "gemini-3.1-flash-image": "3.2_fast_m",
  "gemini-3-pro-image": "3.2_pro_m",
  "gpt-image-2.5-fast": "3.2_image_2_5_fast",
  "gpt-image-2.5-pro": "3.2_image_2_5_pro",
  "gpt-image-2": "3.2_image_2",
  "image-basic": "3.1", "image-fast": "3.2_fast_m",
  "image-pro": "3.2_pro_m", "image-creative": "3.2_image_2",
};
const SIZES = {
  "1024x1024": ["1080p", "1:1"],
  "1536x1024": ["1080p", "3:2"],
  "1024x1536": ["1080p", "2:3"],
  "1792x1024": ["1080p", "16:9"],
  "1024x1792": ["1080p", "9:16"],
  "2048x2048": ["2k", "1:1"],
  "2048x1152": ["2k", "16:9"],
  "1152x2048": ["2k", "9:16"],
  "4096x4096": ["4k", "1:1"],
  "4096x2304": ["4k", "16:9"],
  "2304x4096": ["4k", "9:16"],
};
const RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"];
const RESOLUTIONS = { "1k": "1080p", "1080p": "1080p", "2k": "2k", "4k": "4k" };
const KEYS = ["model", "prompt", "size", "resolution", "aspect_ratio", "quality", "n",
  "response_format", "image_url", "reference_images", "enhance", "stream"];
// 仅允许自有存储的中性路径，禁止把厂商地址或任意上游 URL 交给客户。
const MEDIA_URL_PREFIX = "https://s3.yanxinyu.ggff.net/media_outputs/";
const IMAGE_COUNT_SCHEMA = {
  type: "number", unit: "count", unitLabel: { en: "image", zh: "张" },
  description: { en: "Image generation unit price", zh: "图片生成单价" },
};

export const meta = {
  apiVersion: 1,
  key: "media-image",
  name: "Image Studio",
  version: "1.2.0",
  author: { name: "Image Studio" },
  description: { en: "Image generation and reference images", zh: "图片生成与参考图" },
  icon: "text:Image",
  models: MODELS,
  fetchMode: "per_task",
  auth: "api_key",
  protocols: ["openai_image"],
  usageSchema: {
    image_count: IMAGE_COUNT_SCHEMA,
    resolution: { enum: ["1080p", "2k", "4k"],
      enumLabels: { "1080p": { en: "1K", zh: "1K" }, "2k": { en: "2K", zh: "2K" }, "4k": { en: "4K", zh: "4K" } },
      description: { en: "Output image resolution", zh: "输出图片分辨率" } },
  },
  usageExamples: [
    { label: "1K", facts: { image_count: 1, resolution: "1080p" } },
    { label: "2K", facts: { image_count: 1, resolution: "2k" } },
    { label: "4K", facts: { image_count: 1, resolution: "4k" } },
  ],
  // Lite 模型本身仅支持 1K，不开放超出其能力的档位。
  usageProfiles: [{
    models: ["gemini-3.1-flash-lite-image"],
    schema: {
      image_count: IMAGE_COUNT_SCHEMA,
      resolution: { enum: ["1080p"], enumLabels: { "1080p": { en: "1K", zh: "1K" } },
        description: { en: "Currently available output resolution", zh: "当前可用输出分辨率" } },
    },
    examples: [{ label: "1K", facts: { image_count: 1, resolution: "1080p" } }],
  }],
};

// 尺寸与扩展参数只在一致时合并；不支持的输入必须明确报错，不能默默降档。
export function normalizeImageRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("image request must be an object");
  for (const key of Object.keys(input)) {
    if (KEYS.indexOf(key) < 0) throw new Error("unsupported image parameter: " + key);
  }
  if (MODELS.indexOf(input.model) < 0) throw new Error("unsupported image model");
  if (typeof input.prompt !== "string" || !input.prompt.trim()) throw new Error("prompt must be a non-empty string");
  if (Array.from(input.prompt).length > 4096) throw new Error("prompt must contain at most 4096 characters");
  if (input.n !== undefined && input.n !== 1) throw new Error("this image service supports n=1 only");
  if (input.stream !== undefined && input.stream !== false) throw new Error("streaming images are not supported");
  if (input.response_format !== undefined && input.response_format !== null && input.response_format !== "b64_json" && input.response_format !== "url") {
    throw new Error("response_format must be b64_json or url");
  }
  if (input.enhance !== undefined && typeof input.enhance !== "boolean") throw new Error("enhance must be a boolean");
  let dimensions;
  if (input.size !== undefined && input.size !== "auto") {
    if (typeof input.size !== "string" || !Object.prototype.hasOwnProperty.call(SIZES, input.size)) {
      throw new Error("unsupported image size");
    }
    dimensions = SIZES[input.size];
  }
  let resolution = dimensions ? dimensions[0] : "1080p";
  if (input.resolution !== undefined) {
    if (typeof input.resolution !== "string" || !Object.prototype.hasOwnProperty.call(RESOLUTIONS, input.resolution.toLowerCase())) {
      throw new Error("resolution must be 1k, 1080p, 2k, or 4k");
    }
    const requested = RESOLUTIONS[input.resolution.toLowerCase()];
    if (dimensions && requested !== resolution) throw new Error("size and resolution conflict");
    resolution = requested;
  }
  if (input.model === "gemini-3.1-flash-lite-image" && resolution !== "1080p") {
    throw new Error("this model currently supports 1K only; 2K and 4K are unavailable");
  }
  let ratio = dimensions ? dimensions[1] : "1:1";
  if (input.aspect_ratio !== undefined) {
    if (RATIOS.indexOf(input.aspect_ratio) < 0) throw new Error("unsupported aspect_ratio");
    if (dimensions && input.aspect_ratio !== ratio) throw new Error("size and aspect_ratio conflict");
    ratio = input.aspect_ratio;
  }
  // 当前接口质量随模型固定；不能把原厂 low/medium/high 接收后悄悄忽略。
  const quality = ["gemini-3-pro-image", "gpt-image-2.5-pro", "gpt-image-2", "image-pro", "image-creative"].indexOf(input.model) >= 0 ? "hd" : "standard";
  if (input.quality !== undefined && input.quality !== null && input.quality !== "auto" && input.quality !== quality) {
    throw new Error("quality is fixed for this model; use auto or " + quality);
  }
  const body = { model: input.model, prompt: input.prompt, size: input.size === "auto" || input.size === undefined ? "1024x1024" : input.size,
    resolution, aspect_ratio: ratio, quality, n: 1, response_format: input.response_format || "url", enhance: input.enhance === undefined ? true : input.enhance };
  if (input.reference_images !== undefined && input.image_url !== undefined) throw new Error("reference_images cannot be combined with image_url");
  let sources = input.reference_images;
  if (input.image_url !== undefined) sources = [input.image_url];
  if (sources !== undefined) {
    if (!Array.isArray(sources) || sources.length === 0) throw new Error("reference_images must contain at least one image");
    body.reference_images = sources.map((source) => {
      if (source && typeof source === "object" && source.__fileRef) return source;
      if (typeof source !== "string" || !source.trim() || !/^(https?:\/\/[^\s/]+\/?.*|data:image\/[^;,]+;base64,[A-Za-z0-9+/=\r\n]+)$/.test(source.trim())) {
        throw new Error("reference images must be HTTP(S) URLs or image Base64 data URLs");
      }
      return source.trim();
    });
  }
  return body;
}

// 统一验证并投影自有图片地址，提交解析和客户呈现都不能透传来源字段。
function publicImageResult(body) {
  const entry = body && Array.isArray(body.data) && body.data.length === 1 ? body.data[0] : null;
  if (!entry || typeof entry.url !== "string" || entry.url.indexOf(MEDIA_URL_PREFIX) !== 0 ||
      !/^[a-f0-9]{32}\.(png|jpe?g|webp)$/.test(entry.url.slice(MEDIA_URL_PREFIX.length))) {
    throw new Error("image service returned an invalid image result");
  }
  return { created: body.created, data: [{ url: entry.url }] };
}

export const protocols = {
  openai_image: {
    decodeRequest(ctx) {
      let input;
      if (ctx.body.kind === "json") {
        const value = ctx.body.value;
        input = { ...value, model: ctx.model };
        if (ctx.operation === "edit" && value.image !== undefined) {
          const { image, ...rest } = input;
          if (rest.reference_images !== undefined || rest.image_url !== undefined) throw new Error("image cannot be combined with other reference image parameters");
          input = { ...rest, reference_images: Array.isArray(image) ? image : [image] };
        }
      } else if (ctx.operation === "edit" && ctx.body.kind === "multipart") {
        input = { model: ctx.model };
        for (const name of Object.keys(ctx.body.fields)) {
          const values = ctx.body.fields[name];
          if (values.length !== 1) throw new Error("duplicate image parameter: " + name);
          input[name] = name === "n" ? Number(values[0]) : name === "enhance" || name === "stream" ? values[0] === "true" ? true : values[0] === "false" ? false : values[0] : values[0];
        }
        input.reference_images = ctx.body.files.map((file) => {
          if (file.field !== "image" && file.field !== "image[]") throw new Error("unsupported image file parameter");
          if (!/^image\//.test(file.mimeType)) throw new Error("reference file must be an image");
          return { __fileRef: file.ref, encoding: "dataUrl", maxBytes: 20971520 };
        });
      } else throw new Error("image request must be JSON or an image-edit multipart request");
      // 私有观察ID由图片入口产生，仅关联本次原任务，不作为生图参数。
      const progressId = input._progress_id;
      delete input._progress_id;
      if (progressId !== undefined && (typeof progressId !== "string" || !/^[a-f0-9]{32}$/.test(progressId))) {
        throw new Error("invalid image observation ID");
      }
      const body = normalizeImageRequest(input);
      if (progressId !== undefined) body._progress_id = progressId;
      if (ctx.operation === "edit" && !body.reference_images) throw new Error("image editing requires reference images");
      return { kind: "submit", model: ctx.model, requestBody: body };
    },
    render(ctx, task) {
      // 仅投影图片字段，不将内部任务快照、地址或模型编号回传客户。
      // 官方宿主按客户 response_format 下载自有 URL 并补齐 Base64；插件 JSON 保持小体积。
      return publicImageResult(task.data);
    },
  },
};

export function buildSubmitRequest(ctx) {
  if (!Object.prototype.hasOwnProperty.call(UPSTREAM_MODELS, ctx.model)) throw new Error("unsupported image model");
  const { _progress_id: progressId, ...body } = ctx.requestBody;
  return { url: ctx.baseUrl.replace(/\/$/, "") + "/v1/images/generations", method: "POST",
    headers: { Authorization: ctx.authHeader, "Content-Type": "application/json",
      ...(progressId ? { "X-Image-Progress-Id": progressId } : {}) },
    body: { ...body, model: UPSTREAM_MODELS[ctx.model], response_format: "url" } };
}

export function parseSubmitResponse(ctx, response) {
  const body = publicImageResult(response.body);
  return { taskId: "image-" + utils.uuid(), taskData: body, state: { resolution: ctx.requestBody.resolution }, immediate: { status: "SUCCESS" } };
}

export function buildQueryRequest() { throw new Error("synchronous image results cannot be queried upstream"); }
export function parseTaskResult() { throw new Error("synchronous image results cannot be polled"); }
export function extractUsage(ctx) { return { image_count: 1, resolution: ctx.requestBody.resolution }; }
export function extractUsageOnSubmit(ctx) { return { image_count: 1, resolution: ctx.requestBody.resolution }; }
export function extractUsageOnComplete(ctx, result, taskData) {
  if (!ctx.state || !ctx.state.resolution || !taskData || !Array.isArray(taskData.data)) throw new Error("image usage is missing");
  return { image_count: taskData.data.length, resolution: ctx.state.resolution };
}
