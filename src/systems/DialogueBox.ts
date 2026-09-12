import Phaser from "phaser";
import { FONTS, GAME_HEIGHT, GAME_WIDTH, PALETTE, PALETTE_CSS, SPEAKERS } from "@/config";
import type { ChoiceOption } from "@/data/types";

const BOX_H = 150;
const PAD = 28;
const CPS = 40; // 타자 속도 (글자/초)

/**
 * 하단 대화창. 나레이션/대사 타자 효과 + 선택지.
 * 렌더링만 담당하고 진행 제어는 ScriptRunner 가 한다.
 */
export class DialogueBox {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private cursor: Phaser.GameObjects.Text;
  private choiceRoot: Phaser.GameObjects.Container;
  private typing?: Phaser.Time.TimerEvent;
  private fullText = "";
  private shown = 0;

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

    this.bodyText = scene.add.text(PAD, 42, "", {
      fontFamily: FONTS.body,
      fontSize: "19px",
      color: PALETTE_CSS.bone,
      lineSpacing: 8,
      wordWrap: { width: GAME_WIDTH - PAD * 2, useAdvancedWrap: true },
    });

    this.cursor = scene.add.text(GAME_WIDTH - PAD, BOX_H - 22, "▼", {
      fontFamily: FONTS.mono,
      fontSize: "12px",
      color: PALETTE_CSS.bone,
    }).setOrigin(1, 0.5).setVisible(false);
    scene.tweens.add({ targets: this.cursor, y: BOX_H - 18, duration: 500, yoyo: true, repeat: -1 });

    this.choiceRoot = scene.add.container(0, 0);

    this.root = scene.add.container(0, y, [bg, this.nameText, this.bodyText, this.cursor, this.choiceRoot]);
    this.root.setDepth(1000).setScrollFactor(0).setVisible(false);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  show(): void {
    this.root.setVisible(true);
  }

  hide(): void {
    this.stopTyping();
    this.root.setVisible(false);
    this.clearChoices();
  }

  /** 텍스트 표시 시작. 완료되면 resolve. */
  say(who: string | null, text: string): Promise<void> {
    this.show();
    this.clearChoices();
    const spk = who ? SPEAKERS[who] : null;
    if (spk) {
      this.nameText.setText(spk.name).setColor(spk.color).setVisible(true);
    } else {
      this.nameText.setVisible(false);
    }
    // 이탤릭 마커 *...* 는 M1 에서 레드 이탤릭으로 렌더 예정. 지금은 마커만 제거.
    this.fullText = text.replace(/\*(.+?)\*/g, "$1");
    this.shown = 0;
    this.bodyText.setText("");
    this.cursor.setVisible(false);

    return new Promise((resolve) => {
      this.typing = this.scene.time.addEvent({
        delay: 1000 / CPS,
        repeat: this.fullText.length - 1,
        callback: () => {
          this.shown++;
          this.bodyText.setText(this.fullText.slice(0, this.shown));
          if (this.shown >= this.fullText.length) {
            this.cursor.setVisible(true);
            resolve();
          }
        },
      });
    });
  }

  /** 타자 중이면 즉시 전체 표시. 이미 다 보였으면 false 반환. */
  skipTyping(): boolean {
    if (this.typing && this.shown < this.fullText.length) {
      this.stopTyping();
      this.shown = this.fullText.length;
      this.bodyText.setText(this.fullText);
      this.cursor.setVisible(true);
      return true;
    }
    return false;
  }

  choices(options: ChoiceOption[]): Promise<ChoiceOption> {
    this.show();
    this.cursor.setVisible(false);
    this.clearChoices();
    this.bodyText.setVisible(false);
    return new Promise((resolve) => {
      const startY = 44;
      options.forEach((opt, i) => {
        const t = this.scene.add.text(PAD + 16, startY + i * 30, `${i + 1}. ${opt.text}`, {
          fontFamily: FONTS.body,
          fontSize: "18px",
          color: PALETTE_CSS.bone,
        }).setInteractive({ useHandCursor: true });
        t.on("pointerover", () => t.setColor(PALETTE_CSS.baelzRed));
        t.on("pointerout", () => t.setColor(PALETTE_CSS.bone));
        t.on("pointerdown", () => {
          this.clearChoices();
          resolve(opt);
        });
        this.choiceRoot.add(t);
      });
      // 숫자키로도 선택
      const keyHandler = (e: KeyboardEvent) => {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= options.length) {
          this.scene.input.keyboard?.off("keydown", keyHandler);
          this.clearChoices();
          resolve(options[n - 1]);
        }
      };
      this.scene.input.keyboard?.on("keydown", keyHandler);
    });
  }

  private clearChoices(): void {
    this.choiceRoot.removeAll(true);
    this.bodyText.setVisible(true);
  }

  private stopTyping(): void {
    this.typing?.remove(false);
    this.typing = undefined;
  }
}
