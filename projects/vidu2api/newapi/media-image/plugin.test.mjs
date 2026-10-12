import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

globalThis.utils = { uuid: () => "fixture-id" };
const source = fs.readFileSync(new URL("./plugin.js", import.meta.url), "utf8");
const plugin = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const base = { model: "gemini-3.1-flash-image", prompt: "A red circle on a white background" };

test("public image contract matches activated adapter models/version and accepts entry examples", () => {
  const manifest = JSON.parse(fs.readFileSync(new URL("./public-docs.json", import.meta.url), "utf8"));
  const spec = JSON.parse(fs.readFileSync(new URL("./public-openapi.json", import.meta.url), "utf8"));
  assert.equal(manifest.version, plugin.meta.version);
  assert.equal(spec.info.version, plugin.meta.version);
  assert.deepEqual(manifest.models, plugin.meta.models);
  for (const [endpoint, path] of Object.entries(spec.paths)) {
    const input = structuredClone(path.post.requestBody.content["application/json"].example);
    assert.equal(input.progress, true);
    assert.equal(input.stream, true);
    delete input.progress;
    delete input.delivery;
    delete input.partial_images;
    input.stream = false;
    input.response_format = "url";
    const decoded = plugin.protocols.openai_image.decodeRequest({ model: input.model,
      operation: endpoint.endsWith("/edits") ? "edit" : "generate", body: { kind: "json", value: input } });
    assert.equal(decoded.kind, "submit");
  }
});

test("private progress correlation becomes only an outbound header for JSON and multipart", () => {
  const id = "a".repeat(32);
  for (const body of [
    { kind: "json", value: { ...base, _progress_id: id } },
    { kind: "multipart", fields: { prompt: [base.prompt], _progress_id: [id] },
      files: [{ field: "image", mimeType: "image/png", ref: "fixture" }] },
  ]) {
    const decoded = plugin.protocols.openai_image.decodeRequest({ model: base.model, operation: body.kind === "multipart" ? "edit" : "generate", body });
    const out = plugin.buildSubmitRequest({ ...decoded, baseUrl: "https://example.com", authHeader: "Bearer fixture" });
    assert.equal(out.headers["X-Image-Progress-Id"], id);
    assert.equal(out.body._progress_id, undefined);
    assert.equal(out.body.progress, undefined);
  }
  assert.throws(() => plugin.protocols.openai_image.decodeRequest({ model: base.model, operation: "generate",
    body: { kind: "json", value: { ...base, _progress_id: "wrong" } } }), /invalid image observation/);
  assert.throws(() => plugin.normalizeImageRequest({ ...base, progress: true }), /unsupported/);
});

test("public models accept verified resolution tiers and supported size shapes", () => {
  const sizes = [
    ["1024x1024", "1080p", "1:1"], ["1536x1024", "1080p", "3:2"], ["1024x1536", "1080p", "2:3"],
    ["1792x1024", "1080p", "16:9"], ["1024x1792", "1080p", "9:16"],
    ["2048x2048", "2k", "1:1"], ["2048x1152", "2k", "16:9"], ["1152x2048", "2k", "9:16"],
    ["4096x4096", "4k", "1:1"], ["4096x2304", "4k", "16:9"], ["2304x4096", "4k", "9:16"],
  ];
  for (const model of plugin.meta.models) {
    for (const [size, resolution, ratio] of sizes) {
      const input = { ...base, model, size };
      const before = JSON.stringify(input);
      if (model === "gemini-3.1-flash-lite-image" && resolution !== "1080p") {
        assert.throws(() => plugin.normalizeImageRequest(input), /currently supports 1K only/);
        assert.equal(JSON.stringify(input), before);
        continue;
      }
      const out = plugin.normalizeImageRequest(input);
      assert.equal(out.resolution, resolution);
      assert.equal(out.aspect_ratio, ratio);
      assert.equal(out.n, 1);
      assert.equal(JSON.stringify(input), before);
    }
  }
});

test("Lite rejects high tiers before submission for both generation and editing", () => {
  const model = "gemini-3.1-flash-lite-image";
  for (const options of [{ resolution: "2K" }, { resolution: "4k" }, { size: "2048x2048" }, { size: "4096x2304" }]) {
    for (const operation of ["generate", "edit"]) {
      const value = { ...base, model, ...options, ...(operation === "edit" ? { image: "https://example.com/image.png" } : {}) };
      assert.throws(() => plugin.protocols.openai_image.decodeRequest({ model, operation, body: { kind: "json", value } }), /currently supports 1K only/);
    }
  }
  assert.equal(plugin.normalizeImageRequest({ ...base, model }).resolution, "1080p");
  const profile = plugin.meta.usageProfiles.find((p) => p.models.includes(model));
  assert.deepEqual(profile.schema.resolution.enum, ["1080p"]);
  assert.deepEqual(profile.examples, [{ label: "1K", facts: { image_count: 1, resolution: "1080p" } }]);
  assert.deepEqual(profile.schema.image_count, plugin.meta.usageSchema.image_count);
});

test("explicit resolution and ratio survive normalization, including false and uppercase values", () => {
  for (const [resolution, expected] of [["1k", "1080p"], ["1K", "1080p"], ["1080p", "1080p"], ["2K", "2k"], ["4K", "4k"]]) {
    for (const aspect_ratio of ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"]) {
      const out = plugin.normalizeImageRequest({ ...base, size: "auto", resolution, aspect_ratio, enhance: false });
      assert.equal(out.resolution, expected);
      assert.equal(out.aspect_ratio, aspect_ratio);
      assert.equal(out.enhance, false);
    }
  }
});

const invalid = [
  [{ prompt: "" }, /non-empty/], [{ prompt: "x".repeat(4097) }, /4096/], [{ model: "private-native-id" }, /model/],
  [{ size: "512x512" }, /size/], [{ size: null }, /size/], [{ resolution: "8k" }, /resolution/], [{ resolution: 4096 }, /resolution/],
  [{ aspect_ratio: "5:7" }, /aspect_ratio/], [{ size: "4096x4096", resolution: "2k" }, /conflict/],
  [{ size: "2048x2048", aspect_ratio: "16:9" }, /conflict/], [{ n: 2 }, /n=1/], [{ n: 0 }, /n=1/], [{ n: "1" }, /n=1/],
  [{ response_format: "invalid" }, /b64_json/], [{ stream: true }, /streaming/], [{ enhance: "false" }, /boolean/],
  [{ quality: "high" }, /quality/], [{ quality: "hd" }, /quality/],
  [{ reference_images: [] }, /at least one/], [{ reference_images: ["C:/image.png"] }, /HTTP/],
  [{ image_url: "file:///etc/passwd" }, /HTTP/], [{ image_url: " " }, /HTTP/],
  [{ image_url: "https://example.com/image.png", reference_images: ["https://example.com/other.png"] }, /combined/],
  ...["background", "moderation", "output_format", "output_compression", "input_fidelity", "seed", "style", "user", "mask"].map((key) => [{ [key]: "unsupported" }, /unsupported image parameter/]),
];
for (const [input, error] of invalid) {
  test("rejects invalid or unsupported request " + JSON.stringify(input).slice(0, 100), () => {
    assert.throws(() => plugin.normalizeImageRequest({ ...base, ...input }), error);
  });
}

test("prompt boundary counts Unicode characters and accepts 4096 characters", () => {
  assert.equal(plugin.normalizeImageRequest({ ...base, prompt: "😀".repeat(4096) }).prompt.length, 8192);
  assert.throws(() => plugin.normalizeImageRequest({ ...base, prompt: "😀".repeat(4097) }), /4096/);
});

test("all model-fixed quality settings are accepted, alternatives rejected", () => {
  for (const model of plugin.meta.models) {
    const out = plugin.normalizeImageRequest({ ...base, model, quality: "auto" });
    assert.equal(plugin.normalizeImageRequest({ ...base, model, quality: out.quality }).quality, out.quality);
    assert.throws(() => plugin.normalizeImageRequest({ ...base, model, quality: out.quality === "hd" ? "standard" : "hd" }), /quality/);
  }
});

test("single URL, multiple reference images, and JSON editing use the same canonical request", () => {
  const urls = ["https://example.com/one.png", "data:image/png;base64,aGVsbG8="];
  assert.deepEqual(plugin.normalizeImageRequest({ ...base, image_url: urls[0] }).reference_images, urls.slice(0, 1));
  const context = { model: base.model, operation: "edit", body: { kind: "json", value: { ...base, image: urls, resolution: "4k" } } };
  const out = plugin.protocols.openai_image.decodeRequest(context);
  assert.deepEqual(out.requestBody.reference_images, urls);
  assert.equal(out.requestBody.resolution, "4k");
  assert.throws(() => plugin.protocols.openai_image.decodeRequest({ ...context, body: { kind: "json", value: base } }), /requires/);
});

test("multipart edits retain opaque file references and reject masks and duplicate fields", () => {
  const ctx = { model: base.model, operation: "edit", body: { kind: "multipart", fields: { prompt: [base.prompt], resolution: ["2k"], enhance: ["false"] },
    files: [{ field: "image[]", ref: "request_file:image[]", mimeType: "image/png" }, { field: "image[]", ref: "request_file:image[]#1", mimeType: "image/jpeg" }] } };
  const out = plugin.protocols.openai_image.decodeRequest(ctx).requestBody;
  assert.equal(out.reference_images.length, 2);
  assert.equal(out.reference_images[1].__fileRef, "request_file:image[]#1");
  assert.equal(out.enhance, false);
  assert.throws(() => plugin.protocols.openai_image.decodeRequest({ ...ctx, body: { ...ctx.body, files: [{ ...ctx.body.files[0], field: "mask" }] } }), /unsupported/);
  assert.throws(() => plugin.protocols.openai_image.decodeRequest({ ...ctx, body: { ...ctx.body, fields: { prompt: ["one", "two"] } } }), /duplicate/);
});

test("outbound request maps model privately and retains every supported parameter", () => {
  const requestBody = plugin.normalizeImageRequest({ ...base, resolution: "4k", aspect_ratio: "16:9", enhance: false, reference_images: ["https://example.com/image.png"] });
  const ctx = { model: base.model, upstreamModel: "3.2_fast_m", baseUrl: "https://upstream.example/", authHeader: "Bearer fixture", requestBody };
  const descriptor = plugin.buildSubmitRequest(ctx);
  assert.equal(descriptor.body.model, "3.2_fast_m");
  assert.equal(descriptor.body.resolution, "4k");
  assert.equal(descriptor.body.aspect_ratio, "16:9");
  assert.equal(descriptor.body.enhance, false);
  assert.equal(descriptor.body.response_format, "url");
  assert.deepEqual(descriptor.body.reference_images, requestBody.reference_images);
  assert.equal(requestBody.model, base.model);
  assert.equal(descriptor.model, undefined);
});

test("private mapping works without host model mapping and does not mutate public task context", () => {
  const expected = ["3.2_lite_m", "3.2_fast_m", "3.2_pro_m", "3.2_image_2_5_fast", "3.2_image_2_5_pro", "3.2_image_2", "3.1", "3.2_fast_m", "3.2_pro_m", "3.2_image_2"];
  for (const [index, model] of plugin.meta.models.entries()) {
    const ctx = { model, upstreamModel: model, baseUrl: "https://example.com", authHeader: "Bearer fixture", requestBody: plugin.normalizeImageRequest({ ...base, model }) };
    const before = JSON.stringify(ctx);
    assert.equal(plugin.buildSubmitRequest(ctx).body.model, expected[index]);
    assert.equal(JSON.stringify(ctx), before);
  }
  assert.throws(() => plugin.buildSubmitRequest({ model: "private-native-id" }), /unsupported/);
  assert.doesNotMatch(JSON.stringify(plugin.meta), /3\.2_|3\.1"|vidu/i);
});

test("immediate response renders only owned URL, and reports actual image usage", () => {
  const ctx = { requestBody: plugin.normalizeImageRequest({ ...base, resolution: "4k" }) };
  const owned = "https://s3.yanxinyu.ggff.net/media_outputs/0123456789abcdef0123456789abcdef.png";
  const body = { created: 123, data: [{ url: owned, b64_json: "aW1hZ2U=" }], model: "private" };
  const parsed = plugin.parseSubmitResponse(ctx, { statusCode: 200, body });
  assert.equal(parsed.immediate.status, "SUCCESS");
  assert.deepEqual(plugin.protocols.openai_image.render({}, { data: parsed.taskData }), { created: 123, data: [{ url: owned }] });
  assert.deepEqual(plugin.extractUsageOnComplete({ state: parsed.state }, parsed.immediate, parsed.taskData), { image_count: 1, resolution: "4k" });
  assert.throws(() => plugin.parseSubmitResponse(ctx, { body: { data: [{ url: "https://private/image.png" }] } }), /invalid/);
  assert.throws(() => plugin.extractUsageOnComplete({}, {}, body), /missing/);
});

test("both customer formats use a short owned URL upstream and reject source addresses", () => {
  for (const response_format of ["url", "b64_json"]) {
    const requestBody = plugin.normalizeImageRequest({ ...base, response_format });
    assert.equal(requestBody.response_format, response_format);
    assert.equal(plugin.buildSubmitRequest({ model: base.model, requestBody, baseUrl: "https://example.com" }).body.response_format, "url");
  }
  for (const url of ["https://vidu.example/image.png", "https://s3.yanxinyu.ggff.net/vidu_outputs/image.png", "https://s3.yanxinyu.ggff.net/media_outputs/../image.png", "https://s3.yanxinyu.ggff.net/media_outputs/0123456789abcdef0123456789abcdef.png?source=private", "https://s3.yanxinyu.ggff.net.evil.example/media_outputs/0123456789abcdef0123456789abcdef.png"]) {
    assert.throws(() => plugin.parseSubmitResponse({ requestBody: {} }, { body: { data: [{ url }] } }), /invalid/);
    assert.throws(() => plugin.protocols.openai_image.render({}, { data: { data: [{ url }] } }), /invalid/);
  }
});
