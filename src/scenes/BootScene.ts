import Phaser from "phaser";
import { PALETTE } from "@/config";

/**
 * 에셋 로드 + 플레이스홀더 텍스처 생성.
 * 실제 에셋(public/assets/*)이 없을 때도 게임이 돌아가도록 절차적 텍스처를 만든다.
 * 실제 파일이 존재하면 그것이 우선한다 (M5 에셋 교체 단계).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    // manifest.json 에 적힌 에셋만 로드. 나머지는 makePlaceholders() 가 절차적으로 만든다.
    const base = import.meta.env.BASE_URL;
    this.load.json("manifest", `${base}assets/manifest.json`);
    this.load.once("filecomplete-json-manifest", () => {
      const m = this.cache.json.get("manifest") as Partial<Record<"bg" | "sprites" | "cg" | "audio" | "se" | "ui", string[]>>;
      for (const k of m.bg ?? []) this.load.image(`bg_${k}`, `${base}assets/bg/${k}.png`);
      for (const k of m.sprites ?? []) this.load.image(`spr_${k}`, `${base}assets/sprites/${k}.png`);
      for (const k of m.cg ?? []) this.load.image(`cg_${k}`, `${base}assets/cg/${k}.png`);
      for (const k of m.audio ?? []) this.load.audio(`bgm_${k}`, `${base}assets/audio/${k}.mp3`);
      for (const k of m.se ?? []) this.load.audio(`se_${k}`, `${base}assets/audio/se/${k}.mp3`);
      for (const k of m.ui ?? []) this.load.image(`ui_${k}`, `${base}assets/ui/${k}.png`);
    });
  }

  async create(): Promise<void> {
    this.makePlaceholders();
    // 웹폰트가 준비된 뒤 텍스트를 그려야 폴백 폰트로 캐시되지 않는다.
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
    this.scene.start("Title");
  }

  private makePlaceholders(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const made: string[] = [];
    this.registry.set("placeholders", made);

    // 배경: 키별 톤 (§9-1: 일상=웜, 진실=콜드)
    const bgTone: Record<string, [number, number]> = {
      forest: [0x14201a, 0x2c4034],
      valley: [0x33301e, 0x6a5a34],
      gate: [0x1a1418, 0x3a2a24],
      palace: [0x120c10, 0x2a1a20],
      square: [0x1c1c1e, 0x3a3a3c],
      scaffold: [0x141416, 0x2c2c30],
      ruin: [0x18181a, 0x38383a],
      town: [0x1c1610, 0x3a2e20],
      room: [0x1e160f, 0x40301c],
      rooftop: [0x0a0c1a, 0x1c2040],
      hill: [0x161a1e, 0x2e3a40],
      dark: [0x06060a, 0x0c1018],
    };
    for (const [key, [top, bottom]] of Object.entries(bgTone)) {
      if (this.textures.exists(`bg_${key}`)) continue;
      // generateTexture 는 캔버스 렌더러를 쓰므로 fillGradientStyle 이 안 먹는다 → 띠로 그라데이션
      g.clear();
      const steps = 27;
      const c1 = Phaser.Display.Color.IntegerToColor(top);
      const c2 = Phaser.Display.Color.IntegerToColor(bottom);
      for (let i = 0; i < steps; i++) {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, steps - 1, i);
        g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
        g.fillRect(0, i * 20, 960, 20);
      }
      g.generateTexture(`bg_${key}`, 960, 540);
      made.push(`bg_${key}`);
    }

    // 캐릭터 실루엣 (64×96, 게임 내 1.5배 확대)
    const chars: Record<string, { body: number; accent: number; h: number }> = {
      noah: { body: 0x3a3436, accent: PALETTE.bone, h: 96 },
      baelz: { body: 0x2a1418, accent: PALETTE.baelzRed, h: 90 },
      baelz_child: { body: 0x2a1418, accent: PALETTE.baelzRed, h: 60 },
      baelz_cold: { body: 0x101418, accent: PALETTE.misaCyan, h: 90 },
      risa: { body: 0x111111, accent: PALETTE.risaAmber, h: 96 },
      misa: { body: 0x111111, accent: PALETTE.misaCyan, h: 96 },
      baelz_cry: { body: 0x2a1418, accent: 0xff7a86, h: 90 },
      baelz_child_cold: { body: 0x1a1216, accent: PALETTE.misaCyan, h: 60 },
      baelz_child_cry: { body: 0x2a1418, accent: 0xff7a86, h: 60 },
      baelz_veiled: { body: 0x3a3436, accent: 0x6a6468, h: 60 },
      risa_bare: { body: 0x111111, accent: 0xf5d08a, h: 96 },
      misa_bare: { body: 0x111111, accent: 0x9ae8ef, h: 96 },
      king: { body: 0x3a3028, accent: 0xb0a090, h: 88 },
      eldest: { body: 0x2c2a30, accent: 0x8a8898, h: 96 },
      second: { body: 0x2c2a30, accent: 0x6a6878, h: 98 },
      sister: { body: 0x2c2a30, accent: 0xa898a8, h: 92 },
      child: { body: 0x3a3228, accent: 0xc8b090, h: 52 },
      slaver: { body: 0x241c18, accent: 0x7a5a40, h: 100 },
      horn_boy: { body: 0x2a2620, accent: 0x9a8a70, h: 56 },
      scale_boy: { body: 0x1e2a2a, accent: 0x6ab8b0, h: 54 },
      scale_woman: { body: 0x1e2a2a, accent: 0x6ab8b0, h: 84 },
      elder: { body: 0x2e2820, accent: 0xa09880, h: 82 },
      agent: { body: 0x111111, accent: 0x444444, h: 96 },
    };
    for (const [key, c] of Object.entries(chars)) {
      if (this.textures.exists(`spr_${key}`)) continue;
      g.clear();
      const w = 64;
      const top = 96 - c.h;
      g.fillStyle(c.body, 1);
      g.fillRoundedRect(16, top, 32, c.h, 6);
      g.fillStyle(c.accent, 1);
      g.fillRect(20, top + 8, 24, 4); // 액센트 라인 (눈/가면 위치)
      g.generateTexture(`spr_${key}`, w, 96);
      made.push(`spr_${key}`);
    }

    // 바닥 타일 + 나무 실루엣
    g.clear();
    g.fillStyle(0x0c0e10, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x1a1e20, 1);
    g.fillRect(0, 0, 64, 6);
    g.generateTexture("tile_ground", 64, 64);

    g.clear();
    g.fillStyle(0x0b100d, 1);
    g.fillRect(28, 60, 8, 140);
    g.fillEllipse(32, 60, 64, 110);
    g.generateTexture("prop_tree", 64, 200);

    g.clear();
    g.fillStyle(PALETTE.bone, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture("dot", 6, 6);

    g.destroy();
  }
}
