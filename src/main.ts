import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from "./config";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { ChapterScene } from "./scenes/ChapterScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: PALETTE.ink,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 900 }, debug: false },
  },
  scene: [BootScene, TitleScene, ChapterScene],
});

// 개발 모드에서만 콘솔 디버깅용으로 노출
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
