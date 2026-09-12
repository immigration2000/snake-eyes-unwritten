import Phaser from "phaser";
import { FONTS, GAME_HEIGHT, GAME_WIDTH, PALETTE, PALETTE_CSS } from "@/config";
import { CHAPTERS, getChapter } from "@/data";
import { AudioManager } from "@/systems/AudioManager";
import { SaveManager } from "@/systems/SaveManager";
import { askName } from "@/ui/NameInput";
import { Overlay } from "@/ui/Overlay";

export class TitleScene extends Phaser.Scene {
  private busy = false;

  constructor() {
    super("Title");
  }

  create(): void {
    const save = SaveManager.get();
    const cx = GAME_WIDTH / 2;
    this.busy = false;

    // ?chapter=ch05 로 바로 진입 (테스트용)
    const jump = new URLSearchParams(location.search).get("chapter");
    if (jump && getChapter(jump)) {
      this.scene.start("Chapter", { chapterId: jump });
      return;
    }

    AudioManager.get(this).playBgm("main_theme");

    if (this.textures.exists("ui_title")) {
      // 실제 타이틀 아트 (assets/ui/title.png, 960×540)
      this.add.image(cx, GAME_HEIGHT / 2, "ui_title").setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else {
      this.add.image(cx, GAME_HEIGHT / 2, "bg_forest").setAlpha(0.6);
      this.drawSnakeEyes(cx, 92);
    }

    this.add.text(cx, 150, "SNAKE EYES", { fontFamily: FONTS.display, fontSize: "56px", color: PALETTE_CSS.baelzRed }).setOrigin(0.5);
    this.add.text(cx, 215, "아무도 적지 않은 나라", { fontFamily: FONTS.body, fontSize: "24px", color: PALETTE_CSS.bone }).setOrigin(0.5);
    this.add.text(cx, 250, "THE UNWRITTEN COUNTRY", { fontFamily: FONTS.mono, fontSize: "12px", color: PALETTE_CSS.mute }).setOrigin(0.5);

    const overlay = new Overlay(this, { menuless: true });

    const items: { label: string; enabled: boolean; onPick: () => void }[] = [
      {
        label: "새 이야기",
        enabled: true,
        onPick: async () => {
          if (this.busy) return;
          this.busy = true;
          const name = await askName(save.data.playerName);
          this.busy = false;
          if (name === null) return;
          save.newGame(name);
          this.scene.start("Chapter", { chapterId: "ch01" });
        },
      },
      {
        label: "이어서",
        enabled: save.hasSave,
        onPick: () => this.scene.start("Chapter", { chapterId: save.data.chapterId }),
      },
      { label: "다시 읽기", enabled: save.getFlag("cleared") === true, onPick: () => this.openChapterSelect() },
      { label: "설정", enabled: true, onPick: () => overlay.open("settings") },
    ];

    items.forEach((it, i) => {
      const t = this.add
        .text(cx, 330 + i * 44, it.label, { fontFamily: FONTS.body, fontSize: "22px", color: it.enabled ? PALETTE_CSS.bone : PALETTE_CSS.mute })
        .setOrigin(0.5);
      if (!it.enabled) return;
      t.setInteractive({ useHandCursor: true });
      t.on("pointerover", () => t.setColor(PALETTE_CSS.baelzRed));
      t.on("pointerout", () => t.setColor(PALETTE_CSS.bone));
      t.on("pointerdown", () => {
        if (!overlay.isOpen) it.onPick();
      });
    });

    // 달성한 엔딩 표시
    const endings: [string, string][] = [
      ["seen_ending_pity", "연민"],
      ["seen_ending_respect", "존중"],
      ["seen_ending_awe", "경외"],
    ];
    const got = endings.filter(([k]) => save.getFlag(k) === true).map(([, n]) => n);
    if (got.length) {
      const extra = save.getFlag("hidden_seen") === true ? " · 조약돌" : "";
      this.add
        .text(cx, GAME_HEIGHT - 50, `엔딩 ${got.join(" · ")}${extra}`, { fontFamily: FONTS.mono, fontSize: "11px", color: PALETTE_CSS.mute })
        .setOrigin(0.5);
    }

    this.add
      .text(cx, GAME_HEIGHT - 28, "비영리 팬 창작 · hololive / Hakos Baelz · 2차 창작 가이드라인 준수", { fontFamily: FONTS.mono, fontSize: "11px", color: PALETTE_CSS.mute })
      .setOrigin(0.5);
  }

  /** 플레이스홀더 타이틀 모티프: 주사위 1·1(스네이크 아이즈)을 뱀눈으로 */
  private drawSnakeEyes(cx: number, cy: number): void {
    const g = this.add.graphics();
    for (const dx of [-34, 34]) {
      g.fillStyle(PALETTE.baelzRed, 0.12);
      g.fillCircle(cx + dx, cy, 30);
      g.fillStyle(PALETTE.baelzRed, 0.95);
      g.fillCircle(cx + dx, cy, 15);
      g.fillStyle(PALETTE.ink, 1);
      g.fillRoundedRect(cx + dx - 2.5, cy - 12, 5, 24, 2.5);
    }
    this.tweens.add({ targets: g, alpha: 0.75, duration: 2400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  /** 엔딩 후 열리는 챕터 선택. 플래그는 유지되므로 14장만 다시 골라 다른 엔딩을 볼 수 있다. */
  private openChapterSelect(): void {
    const veil = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x08080b, 0.96).setOrigin(0).setInteractive();
    const root = this.add.container(0, 0, [veil]).setDepth(2500);
    root.add(this.add.text(GAME_WIDTH / 2, 50, "CHAPTERS", { fontFamily: FONTS.display, fontSize: "16px", color: PALETTE_CSS.baelzRed }).setOrigin(0.5));
    const cols = 2;
    const rows = Math.ceil(CHAPTERS.length / cols);
    CHAPTERS.forEach((ch, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const num = /^ch(\d+)$/.exec(ch.id)?.[1].padStart(2, "0") ?? "EP";
      const t = this.add
        .text(200 + col * 300, 100 + row * 36, `${num}  ${ch.title}`, { fontFamily: FONTS.body, fontSize: "18px", color: PALETTE_CSS.bone })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });
      t.on("pointerover", () => t.setColor(PALETTE_CSS.baelzRed));
      t.on("pointerout", () => t.setColor(PALETTE_CSS.bone));
      t.on("pointerdown", () => this.scene.start("Chapter", { chapterId: ch.id }));
      root.add(t);
    });
    const close = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, "닫기", { fontFamily: FONTS.body, fontSize: "18px", color: PALETTE_CSS.mute })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on("pointerdown", () => root.destroy());
    root.add(close);
    this.input.keyboard?.once("keydown-ESC", () => root.destroy());
  }
}
