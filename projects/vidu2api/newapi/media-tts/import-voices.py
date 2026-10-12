"""显式导入音色与已有试听样本；不提交生成任务、不读取管理员密钥。"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlparse

import requests


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-json", required=True)
    parser.add_argument("--source-root", required=True)
    args = parser.parse_args()
    sys.path.insert(0, args.source_root)
    from shared.mp3_audio import strip_mp3_metadata

    root = Path(__file__).parent
    source = json.loads(Path(args.source_json).read_text(encoding="utf-8"))
    samples = root / "public-assets" / "samples"
    samples.mkdir(parents=True, exist_ok=True)
    unavailable = []
    avatars = root / "public-assets" / "avatars"
    avatars.mkdir(parents=True, exist_ok=True)
    def import_voice(voice):
        public_id = "vx_" + hashlib.sha256(voice["id"].encode()).hexdigest()[:12]
        target = samples / f"{public_id}.mp3"
        if not target.exists():
            response = requests.get(voice["preview_url"], timeout=45)
            if response.status_code in (403, 404):
                # 来源明确拒绝或不存在时标记无试听，不使用其他音色冒充。
                unavailable.append({"voice": voice["id"], "status": response.status_code})
            else:
                response.raise_for_status()
                target.write_bytes(strip_mp3_metadata(response.content))
        # 已有头像落地为公开 ID 文件；目录不暴露原始 ID、CDN 地址和来源字段。
        avatar_url = None
        if voice.get("avatar_url"):
            extension = Path(urlparse(voice["avatar_url"]).path).suffix.lower()
            if extension not in (".png", ".jpg", ".webp"):
                raise ValueError(f"Unsupported avatar format: {extension}")
            avatar = avatars / f"{public_id}{extension}"
            if not avatar.exists():
                response = requests.get(voice["avatar_url"], timeout=45)
                response.raise_for_status()
                # 不把 CDN 返回的错误页写成图片，损坏资源必须明确失败。
                data = response.content
                signatures = {".png": data.startswith(b"\x89PNG\r\n\x1a\n"), ".jpg": data.startswith(b"\xff\xd8\xff"), ".webp": data.startswith(b"RIFF") and data[8:12] == b"WEBP"}
                if not signatures[extension]:
                    raise ValueError(f"Invalid avatar image: {public_id}")
                avatar.write_bytes(data)
            avatar_url = f"/assets/media-tts/avatars/{avatar.name}"
        clean = lambda text: re.sub(r"vidu", "Vox", text or "", flags=re.I)
        return {"id": public_id, "models": ["vox-1"], "name": clean(voice["name"]), "language": voice["lang"], "description": clean(voice["description"]), "preview_url": f"/assets/media-tts/samples/{public_id}.mp3" if target.exists() else None, "avatar_url": avatar_url}
    with ThreadPoolExecutor(max_workers=6) as workers:
        voices = list(workers.map(import_voice, source))
    default = next(v["id"] for v in voices if v["language"] == "zh")
    catalog = {"schemaVersion": 1, "version": "1.0.0", "models": [{"id": "vox-1", "name": "Vox 1", "default_voice": default, "output_formats": ["mp3"]}], "voices": voices}
    (root/"public-assets"/"voices.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
    manifest_path = root / "public-docs.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    # 合并本次明确导入的文件，不覆盖其他 AI 登记的公开资源。
    for voice in voices:
        if voice["avatar_url"]:
            name = voice["avatar_url"].removeprefix("/assets/media-tts/")
            manifest["assets"][name] = f"projects/vidu2api/newapi/media-tts/public-assets/{name}"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    mapping = {"vx_"+hashlib.sha256(v["id"].encode()).hexdigest()[:12]: v["id"] for v in source}
    # C 只更新自己的映射；A 的同步映射由源工程 AI 按同一来源核对并交付，导入文档不改业务工程。
    plugin = root / "plugin.js"
    text = plugin.read_text(encoding="utf-8")
    text = re.sub(r"const VOICES = .*?; // 由 import-voices.py 写入稳定音色 ID 映射。", "const VOICES = " + json.dumps(mapping, ensure_ascii=False) + "; // 由 import-voices.py 写入稳定音色 ID 映射。", text, count=1)
    plugin.write_text(text, encoding="utf-8")
    Path(args.source_json).with_name("unavailable-samples.json").write_text(json.dumps(unavailable,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"voices": len(voices), "languages": len({v['language'] for v in voices}), "defaultVoice": default, "sampleBytes": sum(p.stat().st_size for p in samples.glob('*.mp3'))}))


if __name__ == "__main__":
    main()
