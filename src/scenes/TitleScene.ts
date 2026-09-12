import Phaser from "phaser";
import { FONTS, GAME_HEIGHT, GAME_WIDTH, PALETTE_CSS } from "@/config";
import { SaveManager } from "@/systems/SaveManager";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create(): void {
    const save = SaveManager.get();
    const cx = GAME_WIDTH / 2;

    this.add.image(cx, GAME_HEIGHT / 2, "bg_forest").setAlpha(0.6);

    this.add.text(cx, 150, "SNAKE EYES", {
      fontFamily: FONTS.display,
      fontSize: "56px",
      color: PALETTE_CSS.baelzRed,
    }).setOrigin(0.5);

    this.add.text(cx, 215, "아무도 적지 않은 나라", {
      fontFamily: FONTS.body,
      fontSize: "24px",
      color: PALETTE_CSS.bone,
    }).setOrigin(0.5);

    this.add.text(cx, 250, "THE UNWRITTEN COUNTRY", {
      fontFamily: FONTS.mono,
      fontSize: "12px",
      color: PALETTE_CSS.mute,
    }).setOrigin(0.5);

    const items: { label: string; enabled: boolean; onPick: () => void }[] = [
      {
        label: "새 이야기",
        enabled: true,
        onPick: () => {
          const name = window.prompt("기록자의 이름은? (비우면 '노아')", save.data.playerName) ?? "";
          save.newGame(name.trim());
          this.scene.start("Chapter", { chapterId: "ch01" });
        },
      },
      {
        label: "이어서",
        enabled: save.hasSave,
        onPick: () => this.scene.start("Chapter", { chapterId: save.data.chapterId }),
      },
    ];

    items.forEach((it, i) => {
      const t = this.add.text(cx, 340 + i * 44, it.label, {
        fontFamily: FONTS.body,
        fontSize: "22px",
        color: it.enabled ? PALETTE_CSS.bone : PALETTE_CSS.mute,
      }).setOrigin(0.5);
      if (!it.enabled) return;
      t.setInteractive({ useHandCursor: true });
      t.on("pointerover", () => t.setColor(PALETTE_CSS.baelzRed));
      t.on("pointerout", () => t.setColor(PALETTE_CSS.bone));
      t.on("pointerdown", it.onPick);
    });

    this.add.text(cx, GAME_HEIGHT - 28, "비영리 팬 창작 · hololive / Hakos Baelz · 2차 창작 가이드라인 준수", {
      fontFamily: FONTS.mono,
      fontSize: "11px",
      color: PALETTE_CSS.mute,
    }).setOrigin(0.5);
  }
}
