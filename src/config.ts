// 게임 전역 상수. 팔레트는 docs/00_원본_통합자료.md §9-1 기준.
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const PALETTE = {
  ink: 0x08080b,
  bone: 0xece3dd,
  baelzRed: 0xff2c3d,
  risaAmber: 0xf5b13a,
  misaCyan: 0x46d6e3,
  mute: 0x7a7378,
  cold: 0x1a2a33,
} as const;

export const PALETTE_CSS = {
  ink: "#08080b",
  bone: "#ece3dd",
  baelzRed: "#ff2c3d",
  risaAmber: "#f5b13a",
  misaCyan: "#46d6e3",
  mute: "#7a7378",
} as const;

export const FONTS = {
  body: '"Noto Serif KR", serif',
  display: '"Unbounded", sans-serif',
  mono: '"Space Mono", monospace',
} as const;

/** 대화 화자 정보. 레드는 벨즈 전용(§7-4 규칙 1). */
export const SPEAKERS: Record<string, { name: string; color: string; sprite?: string }> = {
  noah: { name: "노아", color: PALETTE_CSS.bone, sprite: "noah" },
  baelz: { name: "베르", color: PALETTE_CSS.baelzRed, sprite: "baelz" },
  baelz_child: { name: "붉은 머리 아이", color: PALETTE_CSS.baelzRed, sprite: "baelz_child" },
  risa: { name: "리사", color: PALETTE_CSS.risaAmber, sprite: "risa" },
  misa: { name: "미사", color: PALETTE_CSS.misaCyan, sprite: "misa" },
  amber: { name: "앰버 가면", color: PALETTE_CSS.risaAmber, sprite: "risa" },
  cyan: { name: "시안 가면", color: PALETTE_CSS.misaCyan, sprite: "misa" },
  king: { name: "왕", color: PALETTE_CSS.bone, sprite: "king" },
  "???": { name: "???", color: PALETTE_CSS.mute },
};

export const SAVE_KEY = "snake-eyes-unwritten:save:v1";
