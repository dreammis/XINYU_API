"""显式导入音色与已有试听样本；不提交生成任务、不读取管理员密钥。"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import re
import sys

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
        # 不复制原始 ID、头像、CDN 地址和来源字段；描述只采用可公开的文本。
        clean = lambda text: re.sub(r"vidu", "Vox", text or "", flags=re.I)
        return {"id": public_id, "models": ["vox-1"], "name": clean(voice["name"]), "language": voice["lang"], "description": clean(voice["description"]), "preview_url": f"/assets/media-tts/samples/{public_id}.mp3" if target.exists() else None}
    with ThreadPoolExecutor(max_workers=6) as workers:
        voices = list(workers.map(import_voice, source))
    default = next(v["id"] for v in voices if v["language"] == "zh")
    catalog = {"schemaVersion": 1, "version": "1.0.0", "models": [{"id": "vox-1", "name": "Vox 1", "default_voice": default, "output_formats": ["mp3"]}], "voices": voices}
    (root/"public-assets"/"voices.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    mapping = {"vx_"+hashlib.sha256(v["id"].encode()).hexdigest()[:12]: v["id"] for v in source}
    plugin = root / "plugin.js"
    text = plugin.read_text(encoding="utf-8")
    text = re.sub(r"const VOICES = .*?; // 由 import-voices.py 写入稳定音色 ID 映射。", "const VOICES = " + json.dumps(mapping, ensure_ascii=False) + "; // 由 import-voices.py 写入稳定音色 ID 映射。", text, count=1)
    plugin.write_text(text, encoding="utf-8")
    Path(args.source_json).with_name("unavailable-samples.json").write_text(json.dumps(unavailable,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"voices": len(voices), "languages": len({v['language'] for v in voices}), "defaultVoice": default, "sampleBytes": sum(p.stat().st_size for p in samples.glob('*.mp3'))}))


if __name__ == "__main__":
    main()
