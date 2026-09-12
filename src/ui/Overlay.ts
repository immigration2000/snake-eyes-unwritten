import Phaser from "phaser";
import { FONTS, GAME_HEIGHT, GAME_WIDTH, PALETTE, PALETTE_CSS, SPEAKERS } from "@/config";
import { Backlog } from "@/systems/ScriptRunner";
import { Settings, TEXT_SPEEDS, TEXT_SPEED_LABELS } from "@/systems/Settings";

type Panel = "menu" | "backlog" | "settings";

export interface OverlayOptions {
  /** 열림/닫힘 통지 (씬이 조작·진행을 잠그는 데 사용) */
  onToggle?: (open: boolean) => void;
  /** "타이틀로" 항목. 없으면 메뉴에 표시 안 함 */
  onTitle?: () => void;
  /** 메뉴 없이 설정만 쓰는 씬(타이틀)용 */
  menuless?: boolean;
}

const TEXT = { fontFamily: FONTS.body, fontSize: "20px", color: PALETTE_CSS.bone };
const LABEL = { fontFamily: FONTS.mono, fontSize: "12px", color: PALETTE_CSS.mute };

/**
 * 일시정지 메뉴 · 백로그 · 설정 오버레이. Esc 로 메뉴, L / 휠 위 로 백로그.
 * 한 씬에 하나. 씬 위에 depth 3000 으로 뜬다.
 */
export class Overlay {
  private scene: Phaser.Scene;
  private opts: OverlayOptions;
  private root: Phaser.GameObjects.Container;
  private panelRoot: Phaser.GameObjects.Container;
  private panel: Panel | null = null;
  private backlogOffset = 0;
  private settings = Settings.get();
  private settingRow = 0;

  constructor(scene: Phaser.Scene, opts: OverlayOptions = {}) {
    this.scene = scene;
    this.opts = opts;
    const veil = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.ink, 0.96).setOrigin(0).setInteractive();
    this.panelRoot = scene.add.container(0, 0);
    this.root = scene.add.container(0, 0, [veil, this.panelRoot]).setDepth(3000).setScrollFactor(0).setVisible(false);

    const kb = scene.input.keyboard;
    kb?.on("keydown", this.onKey, this);
    scene.input.on("wheel", this.onWheel, this);
    scene.events.once("shutdown", () => {
      kb?.off("keydown", this.onKey, this);
      scene.input.off("wheel", this.onWheel, this);
    });
  }

  get isOpen(): boolean {
    return this.panel !== null;
  }

  open(panel: Panel): void {
    const wasOpen = this.isOpen;
    this.panel = panel;
    this.root.setVisible(true);
    if (panel === "backlog") this.backlogOffset = 0;
    this.render();
    if (!wasOpen) this.opts.onToggle?.(true);
  }

  close(): void {
    if (!this.isOpen) return;
    this.panel = null;
    this.root.setVisible(false);
    this.panelRoot.removeAll(true);
    this.opts.onToggle?.(false);
  }

  // ---------- 입력 ----------

  private onKey(e: KeyboardEvent): void {
    if (e.code === "Escape") {
      if (this.isOpen) this.close();
      else if (!this.opts.menuless) this.open("menu");
      return;
    }
    if (!this.isOpen) {
      if (e.code === "KeyL" && !this.opts.menuless) this.open("backlog");
      return;
    }
    if (this.panel === "backlog") {
      if (e.code === "ArrowUp") this.scrollBacklog(1);
      if (e.code === "ArrowDown") this.scrollBacklog(-1);
    } else if (this.panel === "settings") {
      if (e.code === "ArrowUp") this.settingRow = (this.settingRow + 2) % 3;
      if (e.code === "ArrowDown") this.settingRow = (this.settingRow + 1) % 3;
      if (e.code === "ArrowLeft") this.adjust(this.settingRow, -1);
      if (e.code === "ArrowRight") this.adjust(this.settingRow, 1);
      this.render();
    }
  }

  private onWheel(_p: Phaser.Input.Pointer, _o: unknown[], _dx: number, dy: number): void {
    if (this.opts.menuless) return;
    if (!this.isOpen && dy < 0) this.open("backlog");
    else if (this.panel === "backlog") this.scrollBacklog(dy < 0 ? 1 : -1);
  }

  private scrollBacklog(dir: number): void {
    const max = Math.max(0, Backlog.lines.length - 1);
    this.backlogOffset = Phaser.Math.Clamp(this.backlogOffset + dir, 0, max);
    this.render();
  }

  // ---------- 렌더 ----------

  private render(): void {
    this.panelRoot.removeAll(true);
    if (this.panel === "menu") this.renderMenu();
    else if (this.panel === "backlog") this.renderBacklog();
    else if (this.panel === "settings") this.renderSettings();
  }

  private item(x: number, y: number, label: string, onPick: () => void, origin = 0.5): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, label, TEXT).setOrigin(origin, 0.5).setInteractive({ useHandCursor: true });
    t.on("pointerover", () => t.setColor(PALETTE_CSS.baelzRed));
    t.on("pointerout", () => t.setColor(PALETTE_CSS.bone));
    t.on("pointerdown", onPick);
    this.panelRoot.add(t);
    return t;
  }

  private header(title: string, hint: string): void {
    const cx = GAME_WIDTH / 2;
    this.panelRoot.add(this.scene.add.text(cx, 60, title, { fontFamily: FONTS.display, fontSize: "16px", color: PALETTE_CSS.baelzRed }).setOrigin(0.5));
    this.panelRoot.add(this.scene.add.text(cx, GAME_HEIGHT - 30, hint, LABEL).setOrigin(0.5));
  }

  private renderMenu(): void {
    this.header("PAUSE", "Esc 닫기");
    const cx = GAME_WIDTH / 2;
    const items: [string, () => void][] = [
      ["계속", () => this.close()],
      ["백로그", () => this.open("backlog")],
      ["설정", () => this.open("settings")],
    ];
    if (this.opts.onTitle) items.push(["타이틀로", () => { this.close(); this.opts.onTitle?.(); }]);
    items.forEach(([label, fn], i) => this.item(cx, 190 + i * 48, label, fn));
  }

  private renderBacklog(): void {
    this.header("LOG", "↑↓ / 휠 스크롤 · Esc 닫기");
    const lines = Backlog.lines;
    const bottom = GAME_HEIGHT - 60;
    const left = 80;
    const width = GAME_WIDTH - left * 2;
    let y = bottom;
    const end = lines.length - this.backlogOffset;
    for (let i = end - 1; i >= 0; i--) {
      const l = lines[i];
      const spk = l.who ? SPEAKERS[l.who] : null;
      const body = this.scene.add
        .text(left + 120, 0, l.text.replace(/\*(.+?)\*/g, "$1"), {
          fontFamily: FONTS.body,
          fontSize: "17px",
          color: spk ? PALETTE_CSS.bone : PALETTE_CSS.mute,
          lineSpacing: 4,
          wordWrap: { width: width - 120, useAdvancedWrap: true },
        })
        .setOrigin(0, 1);
      y -= 12;
      body.setY(y);
      if (y - body.height < 90) {
        body.destroy();
        break;
      }
      this.panelRoot.add(body);
      if (spk) {
        this.panelRoot.add(
          this.scene.add.text(left, y - body.height, spk.name, { fontFamily: FONTS.mono, fontSize: "13px", color: spk.color }).setOrigin(0, 0),
        );
      }
      y -= body.height;
    }
    if (lines.length === 0) {
      this.panelRoot.add(this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "아직 기록이 없다.", LABEL).setOrigin(0.5));
    }
  }

  private renderSettings(): void {
    this.header("SETTINGS", "↑↓ 항목 · ←→ 조절 · Esc 닫기");
    const s = this.settings.data;
    const speedIdx = Math.max(0, TEXT_SPEEDS.indexOf(s.textSpeed as (typeof TEXT_SPEEDS)[number]));
    const rows: [string, string][] = [
      ["텍스트 속도", TEXT_SPEED_LABELS[speedIdx]],
      ["BGM 볼륨", `${Math.round(s.bgmVolume * 100)}`],
      ["효과음 볼륨", `${Math.round(s.seVolume * 100)}`],
    ];
    const cx = GAME_WIDTH / 2;
    rows.forEach(([label, value], i) => {
      const y = 180 + i * 60;
      const active = i === this.settingRow;
      this.panelRoot.add(
        this.scene.add.text(cx - 200, y, label, { ...TEXT, color: active ? PALETTE_CSS.baelzRed : PALETTE_CSS.bone }).setOrigin(0, 0.5),
      );
      this.item(cx + 90, y, "◀", () => { this.settingRow = i; this.adjust(i, -1); this.render(); });
      this.panelRoot.add(this.scene.add.text(cx + 150, y, value, TEXT).setOrigin(0.5));
      this.item(cx + 210, y, "▶", () => { this.settingRow = i; this.adjust(i, 1); this.render(); });
    });
    if (!this.opts.menuless) this.item(cx, 420, "돌아가기", () => this.open("menu"));
    else this.item(cx, 420, "닫기", () => this.close());
  }

  private adjust(row: number, dir: number): void {
    const s = this.settings;
    if (row === 0) {
      const idx = Math.max(0, TEXT_SPEEDS.indexOf(s.data.textSpeed as (typeof TEXT_SPEEDS)[number]));
      s.set("textSpeed", TEXT_SPEEDS[Phaser.Math.Clamp(idx + dir, 0, TEXT_SPEEDS.length - 1)]);
    } else if (row === 1) {
      s.set("bgmVolume", Phaser.Math.Clamp(Math.round((s.data.bgmVolume + dir * 0.1) * 10) / 10, 0, 1));
    } else {
      s.set("seVolume", Phaser.Math.Clamp(Math.round((s.data.seVolume + dir * 0.1) * 10) / 10, 0, 1));
    }
  }
}
