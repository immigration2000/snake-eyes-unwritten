import Phaser from "phaser";
import { FONTS, GAME_HEIGHT, GAME_WIDTH, PALETTE, PALETTE_CSS } from "@/config";

/** 터치 기기 여부. 마우스가 있는 기기에선 버튼을 띄우지 않는다. */
export function isTouchDevice(): boolean {
  return typeof window !== "undefined" && (navigator.maxTouchPoints > 0 || "ontouchstart" in window) && !window.matchMedia("(pointer: fine)").matches;
}

/**
 * 모바일 가상 버튼: ◀ ▶ 이동, ● 상호작용.
 * 대화 진행은 화면 탭이 이미 처리하므로 탐색 중에만 보인다.
 */
export class TouchControls {
  readonly left = { isDown: false };
  readonly right = { isDown: false };
  private root: Phaser.GameObjects.Container;
  private onInteract: () => void;

  constructor(scene: Phaser.Scene, onInteract: () => void) {
    this.onInteract = onInteract;
    const y = GAME_HEIGHT - 150 - 56;
    const mk = (x: number, label: string, hold?: { isDown: boolean }) => {
      const bg = scene.add.circle(0, 0, 34, PALETTE.ink, 0.55).setStrokeStyle(1, PALETTE.bone, 0.4);
      const txt = scene.add.text(0, 0, label, { fontFamily: FONTS.mono, fontSize: "20px", color: PALETTE_CSS.bone }).setOrigin(0.5);
      const c = scene.add.container(x, y, [bg, txt]);
      bg.setInteractive({ useHandCursor: true });
      if (hold) {
        bg.on("pointerdown", () => (hold.isDown = true));
        bg.on("pointerup", () => (hold.isDown = false));
        bg.on("pointerout", () => (hold.isDown = false));
      } else {
        bg.on("pointerdown", () => this.onInteract());
      }
      return c;
    };
    this.root = scene.add
      .container(0, 0, [mk(60, "◀", this.left), mk(140, "▶", this.right), mk(GAME_WIDTH - 60, "●")])
      .setScrollFactor(0)
      .setDepth(950);
  }

  setVisible(v: boolean): void {
    this.root.setVisible(v);
    if (!v) this.left.isDown = this.right.isDown = false;
  }
}
