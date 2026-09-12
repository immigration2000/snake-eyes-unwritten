"""
에셋 일괄 생성 (diffusers, SDXL 계열). scripts/asset_prompts.json 의 프롬프트로
raw-assets/<종류>/<키>.png 를 만든다. 이후 prep_assets.py 로 게임 규격에 맞춘다.

사용법 (torch+diffusers 가 있는 파이썬으로 — 이 PC 에선 ../StableDiffusion/venv):
  ../StableDiffusion/venv/Scripts/python.exe scripts/gen_assets.py
  python scripts/gen_assets.py                      # 전부
  python scripts/gen_assets.py --kind bg            # 배경만
  python scripts/gen_assets.py --kind cg --keys ch08_wish,ch16_gift
  python scripts/gen_assets.py --model Laxhar/noobai-XL-1.1 --steps 28 --cfg 5.5
  python scripts/gen_assets.py --seed 7 --overwrite

권장 모델 (원본 §7-1): Illustrious / NoobAI-XL 계열. HF 에서 처음 받을 때 ~7GB.
  - OnomaAIResearch/Illustrious-xl-early-release-v0
  - Laxhar/noobai-XL-1.1
로컬 .safetensors 단일 파일도 --model 에 경로로 넘길 수 있다.

같은 키를 여러 장 뽑아 고르고 싶으면 --n 3 → <키>_1.png … 로 저장되며, 마음에 드는 것을 <키>.png 로 이름 바꾸면 된다.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROMPTS = ROOT / "scripts" / "asset_prompts.json"
OUT = ROOT / "raw-assets"


def build_prompts(spec: dict, kind: str) -> list[tuple[str, str, tuple[int, int]]]:
    section = spec[kind]
    size = tuple(section["size"])
    suffix = section.get("suffix", "")
    tags = {k[:-5]: v for k, v in section.items() if k.endswith("_tags")}  # baelz_tags → {baelz}
    out = []
    for key, body in section["items"].items():
        for name, val in tags.items():
            body = body.replace("{" + name + "}", val + ",")
        parts = [spec["prefix"], body]
        if suffix:
            parts.append(suffix)
        out.append((key, ", ".join(p.strip(", ") for p in parts if p), size))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--kind", choices=["bg", "sprites", "cg", "ui"], help="생성할 종류 (기본: 전부)")
    ap.add_argument("--keys", help="쉼표로 구분한 키 목록")
    ap.add_argument("--model", default="OnomaAIResearch/Illustrious-xl-early-release-v0")
    ap.add_argument("--steps", type=int, default=28)
    ap.add_argument("--cfg", type=float, default=6.0)
    ap.add_argument("--seed", type=int, default=None, help="고정 시드 (없으면 키별 랜덤)")
    ap.add_argument("--n", type=int, default=1, help="키당 장수")
    ap.add_argument("--overwrite", action="store_true")
    ap.add_argument("--dry-run", action="store_true", help="프롬프트만 출력")
    ap.add_argument("--offload", action="store_true", help="VRAM 부족 시 CPU 오프로드 강제")
    args = ap.parse_args()

    spec = json.loads(PROMPTS.read_text(encoding="utf-8"))
    kinds = [args.kind] if args.kind else ["bg", "sprites", "cg", "ui"]
    only = set(args.keys.split(",")) if args.keys else None

    jobs = []
    for kind in kinds:
        for key, prompt, size in build_prompts(spec, kind):
            if only and key not in only:
                continue
            jobs.append((kind, key, prompt, size))

    if args.dry_run:
        for kind, key, prompt, size in jobs:
            print(f"[{kind}/{key}] {size[0]}x{size[1]}\n  {prompt}\n")
        print(f"{len(jobs)}개")
        return 0

    try:
        import torch
        from diffusers import StableDiffusionXLPipeline
    except ImportError:
        print("diffusers/torch 가 필요합니다: pip install torch diffusers transformers accelerate safetensors", file=sys.stderr)
        return 1

    print(f"모델 로딩: {args.model}")
    if args.model.endswith(".safetensors"):
        pipe = StableDiffusionXLPipeline.from_single_file(args.model, torch_dtype=torch.float16)
    else:
        pipe = StableDiffusionXLPipeline.from_pretrained(args.model, torch_dtype=torch.float16, use_safetensors=True)
    # VRAM 이 넉넉하면 전부 GPU 에, 아니면(다른 앱이 쓰는 중 등) 모듈별 오프로드
    free_gb = torch.cuda.mem_get_info()[0] / 1e9
    if args.offload or free_gb < 9:
        print(f"여유 VRAM {free_gb:.1f}GB → model_cpu_offload 사용 (느리지만 안전)")
        pipe.enable_model_cpu_offload()
    else:
        pipe.to("cuda")
    pipe.enable_vae_slicing()

    for i, (kind, key, prompt, size) in enumerate(jobs, 1):
        outdir = OUT / kind
        outdir.mkdir(parents=True, exist_ok=True)
        for k in range(1, args.n + 1):
            name = f"{key}.png" if args.n == 1 else f"{key}_{k}.png"
            path = outdir / name
            if path.exists() and not args.overwrite:
                print(f"[{i}/{len(jobs)}] 건너뜀 (있음): {kind}/{name}")
                continue
            seed = args.seed if args.seed is not None else int.from_bytes(os.urandom(4), "little")
            gen = torch.Generator("cuda").manual_seed(seed)
            print(f"[{i}/{len(jobs)}] {kind}/{name}  seed={seed}")
            img = pipe(
                prompt=prompt,
                negative_prompt=", ".join(x for x in [spec["negative"], spec[kind].get("negative", "")] if x),
                width=size[0],
                height=size[1],
                num_inference_steps=args.steps,
                guidance_scale=args.cfg,
                generator=gen,
            ).images[0]
            img.save(path)
    print("완료. 다음: python scripts/prep_assets.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
