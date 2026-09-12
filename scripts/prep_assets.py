"""
raw-assets/ → public/assets/ 규격화 + manifest.json 갱신.

  bg, cg, ui : 960×540 으로 커버 크롭 리사이즈 (PNG)
  sprites    : 배경 제거(rembg 설치 시) → 투명 여백 트림 → 높이 96/60px 등 게임 규격으로 축소
  audio      : raw-assets/audio/*.mp3 를 그대로 복사 (audio/se/ 는 se 로)

사용법:
  python scripts/prep_assets.py            # 전부
  python scripts/prep_assets.py --kind bg
  python scripts/prep_assets.py --no-rembg # 배경 제거 건너뜀 (이미 투명 PNG 일 때)

manifest 는 public/assets/ 에 실제로 존재하는 파일 기준으로 다시 쓴다.
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw-assets"
PUB = ROOT / "public" / "assets"
MANIFEST = PUB / "manifest.json"

SCREEN = (960, 540)
# 스프라이트 높이 (px). BootScene 플레이스홀더의 h 와 맞춘다. 없는 키는 96.
SPRITE_H = {
    "baelz": 90, "baelz_cold": 90, "baelz_cry": 90,
    "baelz_child": 60, "baelz_child_cold": 60, "baelz_child_cry": 60, "baelz_veiled": 60,
    "king": 88, "sister": 92, "second": 98, "child": 52, "slaver": 100,
    "horn_boy": 56, "scale_boy": 54, "scale_woman": 84, "elder": 82,
}
SPRITE_SCALE = 1.0  # 월드(1배)·VN 배우(1.5배) 둘 다 쓰므로 기준 높이 그대로 저장


def cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    w, h = img.size
    tw, th = size
    scale = max(tw / w, th / h)
    img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    left = (img.width - tw) // 2
    top = (img.height - th) // 2
    return img.crop((left, top, left + tw, top + th))


def remove_bg(img: Image.Image) -> Image.Image:
    try:
        from rembg import remove
    except ImportError:
        print("  (rembg 없음 — 배경 제거 건너뜀. pip install rembg)")
        return img.convert("RGBA")
    return remove(img)


def prep_sprite(src: Path, dst: Path, use_rembg: bool) -> None:
    img = Image.open(src)
    if use_rembg and img.mode != "RGBA":
        img = remove_bg(img)
    img = img.convert("RGBA")
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    h = round(SPRITE_H.get(src.stem, 96) * SPRITE_SCALE)
    w = round(img.width * h / img.height)
    img = img.resize((w, h), Image.LANCZOS)
    img.save(dst)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--kind", choices=["bg", "sprites", "cg", "ui", "audio"])
    ap.add_argument("--no-rembg", action="store_true")
    args = ap.parse_args()
    kinds = [args.kind] if args.kind else ["bg", "sprites", "cg", "ui", "audio"]

    for kind in kinds:
        src_dir = RAW / kind
        if not src_dir.exists():
            continue
        if kind == "audio":
            for f in list(src_dir.glob("*.mp3")) + list(src_dir.glob("se/*.mp3")):
                rel = f.relative_to(src_dir)
                dst = PUB / "audio" / rel
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, dst)
                print(f"audio/{rel}")
            continue
        (PUB / kind).mkdir(parents=True, exist_ok=True)
        for f in sorted(src_dir.glob("*.png")):
            if "_" in f.stem and f.stem.rsplit("_", 1)[1].isdigit() and kind != "cg":
                continue  # 후보(<키>_1.png)는 건너뜀 — 고른 것만 <키>.png 로
            dst = PUB / kind / f.name
            if kind == "sprites":
                prep_sprite(f, dst, not args.no_rembg)
            else:
                cover(Image.open(f).convert("RGB"), SCREEN).save(dst, optimize=True)
            print(f"{kind}/{f.name}")

    # manifest: 실제 파일 기준
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for kind in ["bg", "sprites", "cg", "ui"]:
        m[kind] = sorted(p.stem for p in (PUB / kind).glob("*.png"))
    m["audio"] = sorted(p.stem for p in (PUB / "audio").glob("*.mp3"))
    m["se"] = sorted(p.stem for p in (PUB / "audio" / "se").glob("*.mp3"))
    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("manifest.json 갱신:", {k: len(v) for k, v in m.items() if isinstance(v, list)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
