import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./plugin.js", import.meta.url), "utf8");
const plugin = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const base = { model: "cogvideo-fast", prompt: "A paper boat floating on a quiet pond" };

test("model boundaries and default dimensions produce valid upstream parameters", () => {
  for (const model of plugin.meta.models) {
    const input = { ...base, model };
    const before = JSON.stringify(input);
    const { body } = plugin.normalizeVideoRequest(input);
    assert.equal(body.duration, model.endsWith("short") ? 8 : 5);
    assert.equal(body.resolution, model.endsWith("short") ? "720p" : "1080p");
    assert.equal(body.aspect_ratio, model.endsWith("short") ? "9:16" : "16:9");
    assert.equal(body.sample_count, 1);
    assert.equal(JSON.stringify(input), before);
  }
  assert.equal(plugin.normalizeVideoRequest({ ...base, seconds: "8", size: "1080x1920" }).body.duration, 8);
  for (const input of [
    { model: "cogvideo-basic", seconds: 8 }, { model: "cogvideo-short", seconds: 5 },
    { model: "cogvideo-short", input_reference: "https://example.com/a.png" },
    { seconds: "4.5" }, { size: "1280x720" }, { n: 2 },
    { size: "1080x1920", aspect_ratio: "16:9" }, { seconds: 8, duration: 5 },
    { resolution: "1080p", metadata: { resolution: "720p" } },
  ]) assert.throws(() => plugin.normalizeVideoRequest({ ...base, ...input }));
});

test("image and reference modes preserve all images and reject unsupported combinations", () => {
  const images = ["https://example.com/a.png", "https://example.com/b.png"];
  const out = plugin.normalizeVideoRequest({ ...base, metadata: { mode: "reference_to_video", reference_images: images, generation_mode: "speed" } });
  assert.equal(out.action, "reference_to_video");
  assert.deepEqual(out.body.reference_images, images);
  assert.equal(out.body.generation_mode, "speed");
  assert.equal(plugin.normalizeVideoRequest({ ...base, input_reference: images[0] }).action, "image_to_video");
  for (const input of [
    { model: "cogvideo-basic", reference_images: images }, { reference_images: images, seconds: 2 },
    { input_reference: images[0], reference_images: images }, { reference_images: [] },
    { reference_images: [images[0], ""] }, { input_reference: "G:/secret.png" },
    { generation_mode: "pro" }, { metadata: { mode: "reference_to_video" } },
  ]) assert.throws(() => plugin.normalizeVideoRequest({ ...base, ...input }));
});

test("multipart input_reference becomes an opaque data URL placeholder and JSON upstream body", () => {
  const intent = plugin.protocols.openai_video.decodeRequest({ model: base.model, body: { kind: "multipart", fields: { prompt: [base.prompt], seconds: ["8"], size: ["1080x1920"] }, files: [{ ref: "request_file:input_reference", field: "input_reference", mimeType: "image/png" }] } });
  assert.equal(intent.requestBody.duration, 8);
  assert.equal(intent.requestBody.image_url.encoding, "dataUrl");
  const upstream = plugin.buildSubmitRequest({ requestBody: intent.requestBody, model: base.model, upstreamModel: "video-fast", baseUrl: "https://upstream.example/", authHeader: "Bearer fixture" });
  assert.equal(upstream.url, "https://upstream.example/v1/videos");
  assert.equal(upstream.body.model, "video-fast");
  assert.equal(upstream.body.duration, 8);
  assert.equal(upstream.body.aspect_ratio, "9:16");
  assert.equal(upstream.headers.Authorization, "Bearer fixture");
});

test("Responses structured input preserves two reference images and uses identical normalization", () => {
  const intent = plugin.protocols.openai_responses.decodeRequest({ model: base.model, body: { kind: "json", value: { input: [{ role: "user", content: [{ type: "input_text", text: base.prompt }, { type: "input_image", image_url: "https://example.com/a.png" }, { type: "input_image", image_url: "https://example.com/b.png" }] }], seconds: "8", stream: true, metadata: { mode: "reference_to_video" } } } });
  assert.equal(intent.action, "reference_to_video");
  assert.equal(intent.requestBody.reference_images.length, 2);
  assert.equal(intent.requestBody.duration, 8);
  assert.throws(() => plugin.protocols.openai_responses.decodeRequest({ model: base.model, body: { kind: "json", value: { input: [{ type: "input_audio" }] } } }));
});

test("task status failures and public projections hide private models, URLs and errors", () => {
  const failed = { status: "failed", error: "Vidu upstream rejected private-model" };
  const result = plugin.parseTaskResult({}, failed);
  assert.equal(result.status, "FAILURE");
  assert.doesNotMatch(JSON.stringify(result), /vidu|private-model/i);
  const task = { task_id: "task_public", status: "FAILURE", created_at: 123, data: failed, properties: { upstream_model_name: "private-model" } };
  assert.doesNotMatch(JSON.stringify(plugin.protocols.openai_video.render({}, task)), /vidu|private-model/i);
  assert.equal(plugin.parseTaskResult({}, { status: "completed", data: [] }).status, "UNKNOWN");
});

test("artifacts use credentialless proxy and Responses use the host URL only", () => {
  const task = { status: "SUCCESS", data: { status: "completed", data: [{ url: "https://private.example/video.mp4" }] } };
  assert.equal(plugin.listArtifacts(task)[0].key, "video");
  assert.deepEqual(plugin.buildContentRequest({ ...task, artifactKey: "video", clientRequest: { method: "HEAD" } }), { url: "https://private.example/video.mp4", method: "HEAD", credentialless: true });
  const ctx = { artifacts: { video: { url: "https://public.example/video?access=test" } } };
  const event = plugin.protocols.openai_responses.renderEvents(ctx, task);
  assert.equal(event.done, true);
  assert.match(event.events[0].data, /public.example/);
  assert.doesNotMatch(JSON.stringify(event), /private.example/);
  assert.equal(plugin.protocols.openai_responses.renderEvents(ctx, task, { status: "SUCCESS" }).events.length, 0);
});

test("fixed per-call billing does not multiply by video duration", () => {
  for (const duration of [1, 5, 8, 10]) assert.equal(plugin.extractUsage({ requestBody: { duration }, usagePurpose: "billing_ratios" }), null);
});
