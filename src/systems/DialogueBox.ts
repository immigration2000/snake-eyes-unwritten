import Phaser from "phaser";
import { FONTS, GAME_HEIGHT, GAME_WIDTH, PALETTE, PALETTE_CSS, SPEAKERS } from "@/config";
import type { ChoiceOption } from "@/data/types";
import { RichText } from "./RichText";
import { Settings } from "./Settings";

const BOX_H = 150;
const PAD = 28;

/**
 * 하단 대화창. 나레이션/대사 타자 효과 + 선택지.
 * 렌더링만 담당하고 진행 제어는 ScriptRunner 가 한다.
 */
export class DialogueBox {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private body: RichText;
  private cursor: Phaser.GameObjects.Text;
  private choiceRoot: Phaser.GameObjects.Container;
  private typing?: Phaser.Time.TimerEvent;
  private shown = 0;
  private settings = Settings.get();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const y = GAME_HEIGHT - BOX_H;

    const bg = scene.add.graphics();
    bg.fillStyle(PALETTE.ink, 0.97);
    bg.fillRect(0, 0, GAME_WIDTH, BOX_H);
    bg.lineStyle(1, PALETTE.bone, 0.25);
    bg.lineBetween(0, 0, GAME_WIDTH, 0);

    this.nameText = scene.add.text(PAD, 14, "", {
      fontFamily: FONTS.mono,
      fontSize: "14px",
      color: PALETTE_CSS.bone,
    });

    this.body = new RichText(
      scene,
      PAD,
      42,
      GAME_WIDTH - PAD * 2,
      { fontFamily: FONTS.body, fontSize: "19px", color: PALETTE_CSS.bone },
      PALETTE_CSS.baelzRed,
    );

    this.cursor = scene.add
      .text(GAME_WIDTH - PAD, BOX_H - 22, "▼", { fontFamily: FONTS.mono, fontSize: "12px", color: PALETTE_CSS.bone })
      .setOrigin(1, 0.5)
      .setVisible(false);
    scene.tweens.add({ targets: this.cursor, y: BOX_H - 18, duration: 500, yoyo: true, repeat: -1 });

    this.choiceRoot = scene.add.container(0, 0);

    this.root = scene.add.container(0, y, [bg, this.nameText, this.body.container, this.cursor, this.choiceRoot]);
    this.root.setDepth(1000).setScrollFactor(0).setVisible(false);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  get isTyping(): boolean {
    return !!this.typing && this.shown < this.body.total;
  }

  show(): void {
    this.root.setVisible(true);
  }

  hide(): void {
    this.stopTyping();
    this.root.setVisible(false);
    this.clearChoices();
  }

  /** 텍스트 표시 시작. 타자가 끝나면 resolve. instant 면 즉시 전체 표시. */
  say(who: string | null, text: string, instant = false): Promise<void> {
    this.show();
    this.clearChoices();
    const spk = who ? SPEAKERS[who] : null;
    if (spk) {
      this.nameText.setText(spk.name).setColor(spk.color).setVisible(true);
    } else {
      this.nameText.setVisible(false);
    }
    this.stopTyping();
    this.body.setContent(text);
    this.shown = 0;
    this.cursor.setVisible(false);

    const cps = this.settings.data.textSpeed;
    if (instant || cps >= 999 || this.body.total === 0) {
      this.finishTyping();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.typing = this.scene.time.addEvent({
        delay: 1000 / cps,
        repeat: this.body.total - 1,
        callback: () => {
          this.shown++;
          this.body.reveal(this.shown);
          if (this.shown >= this.body.total) {
            this.finishTyping();
            resolve();
          }
        },
      });
    });
  }

  /** 타자 중이면 즉시 전체 표시. 이미 다 보였으면 false 반환. */
  skipTyping(): boolean {
    if (this.isTyping) {
      this.finishTyping();
      return true;
    }
    return false;
  }

  choices(options: ChoiceOption[]): Promise<ChoiceOption> {
    this.show();
    this.cursor.setVisible(false);
    this.clearChoices();
    this.body.setVisible(false);
    return new Promise((resolve) => {
      const startY = 44;
      const kb = this.scene.input.keyboard;
      const keyHandler = (e: KeyboardEvent) => {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= options.length) pick(options[n - 1]);
      };
      const pick = (opt: ChoiceOption) => {
        kb?.off("keydown", keyHandler);
        this.clearChoices();
        resolve(opt);
      };
      options.forEach((opt, i) => {
        const t = this.scene.add
          .text(PAD + 16, startY + i * 30, `${i + 1}. ${opt.text}`, { fontFamily: FONTS.body, fontSize: "18px", color: PALETTE_CSS.bone })
          .setInteractive({ useHandCursor: true });
        t.on("pointerover", () => t.setColor(PALETTE_CSS.baelzRed));
        t.on("pointerout", () => t.setColor(PALETTE_CSS.bone));
        t.on("pointerdown", () => pick(opt));
        this.choiceRoot.add(t);
      });
      kb?.on("keydown", keyHandler);
    });
  }

  private finishTyping(): void {
    this.stopTyping();
    this.shown = this.body.total;
    this.body.revealAll();
    this.cursor.setVisible(true);
  }

  private clearChoices(): void {
    this.choiceRoot.removeAll(true);
    this.body.setVisible(true);
  }

  private stopTyping(): void {
    this.typing?.remove(false);
    this.typing = undefined;
  }
}
