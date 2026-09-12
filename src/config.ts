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
  bel: { name: "베르", color: PALETTE_CSS.baelzRed, sprite: "baelz_child" }, // 회상 속 어린 베르
  baelz_veiled: { name: "면포의 아이", color: PALETTE_CSS.baelzRed, sprite: "baelz_veiled" },
  court: { name: "신하들", color: PALETTE_CSS.mute },
  mother: { name: "아이의 어미", color: PALETTE_CSS.mute },
  king: { name: "왕", color: PALETTE_CSS.bone, sprite: "king" },
  eldest: { name: "맏이", color: PALETTE_CSS.mute, sprite: "eldest" },
  second: { name: "둘째", color: PALETTE_CSS.mute, sprite: "second" },
  sister: { name: "언니", color: PALETTE_CSS.mute, sprite: "sister" },
  child: { name: "앞니 빠진 아이", color: PALETTE_CSS.bone, sprite: "child" },
  slaver: { name: "노예상", color: PALETTE_CSS.mute, sprite: "slaver" },
  horn_boy: { name: "뿔 부러진 소년", color: PALETTE_CSS.bone, sprite: "horn_boy" },
  scale_boy: { name: "비늘 소년", color: PALETTE_CSS.bone, sprite: "scale_boy" },
  scale_woman: { name: "비늘 여자", color: PALETTE_CSS.bone, sprite: "scale_woman" },
  elder: { name: "뿔 노인", color: PALETTE_CSS.bone, sprite: "elder" },
  agent: { name: "수하", color: PALETTE_CSS.mute, sprite: "agent" },
  crowd: { name: "군중", color: PALETTE_CSS.mute },
  "???": { name: "???", color: PALETTE_CSS.mute },
};

export const SAVE_KEY = "snake-eyes-unwritten:save:v1";
