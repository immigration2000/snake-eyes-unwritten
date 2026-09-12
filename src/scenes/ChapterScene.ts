import Phaser from "phaser";
import { FONTS, GAME_HEIGHT, GAME_WIDTH, PALETTE, PALETTE_CSS, SPEAKERS } from "@/config";
import { getChapter } from "@/data";
import type { Chapter, Cmd, Trigger } from "@/data/types";
import { AudioManager } from "@/systems/AudioManager";
import { DialogueBox } from "@/systems/DialogueBox";
import { ScriptRunner, type StageHooks } from "@/systems/ScriptRunner";
import { SaveManager } from "@/systems/SaveManager";
import { Overlay } from "@/ui/Overlay";
import { TouchControls, isTouchDevice } from "@/ui/TouchControls";

const GROUND_Y = 450;
const PLAYER_SPEED = 170;
const INTERACT_RANGE = 48;
const PART_NAMES = ["", "부 I. 숲의 아이", "부 II. 기록", "부 III. 머무는 날들", "부 IV. 진실", "부 V. 다시 쓰기"];
/** 색조 오버레이 (MULTIPLY). §9-1: 일상=웜, 진실=콜드 */
const TONES: Record<string, number> = { cold: 0x7fb8c8, warm: 0xf2cf9a };

interface TriggerView {
  def: Trigger;
  id: string;
  hint?: Phaser.GameObjects.Text;
  fired: boolean;
}

/**
 * 챕터 씬. world 가 있으면 사이드스크롤 탐색 + 트리거, 없으면 순수 VN.
 * 스크립트 실행 중에는 플레이어 조작이 잠긴다.
 */
export class ChapterScene extends Phaser.Scene implements StageHooks {
  private chapter!: Chapter;
  private save = SaveManager.get();
  private box!: DialogueBox;
  private runner!: ScriptRunner;
  private bg!: Phaser.GameObjects.Image;
  private cg?: Phaser.GameObjects.Image;
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: { a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key; e: Phaser.Input.Keyboard.Key };
  private triggers: TriggerView[] = [];
  private triggerSprites: Phaser.GameObjects.Image[] = [];
  private actors = new Map<string, Phaser.GameObjects.Image>();
  private nearest: TriggerView | null = null;
  private audio!: AudioManager;
  private overlay!: Overlay;
  private tint!: Phaser.GameObjects.Rectangle;
  private chaosTimer?: Phaser.Time.TimerEvent;
  private touch?: TouchControls;

  constructor() {
    super("Chapter");
  }

  init(data: { chapterId: string }): void {
    const ch = getChapter(data.chapterId);
    if (!ch) throw new Error(`챕터 없음: ${data.chapterId}`);
    this.chapter = ch;
    this.triggers = [];
    this.triggerSprites = [];
    this.actors.clear();
    this.nearest = null;
    this.player = undefined;
    this.cg = undefined;
    this.touch = undefined;
  }

  create(): void {
    const ch = this.chapter;
    this.save.checkpoint(ch.id);

    const worldW = ch.world?.width ?? GAME_WIDTH;
    this.cameras.main.setBounds(0, 0, worldW, GAME_HEIGHT);
    this.physics.world.setBounds(0, 0, worldW, GAME_HEIGHT);

    // 배경 (약한 패럴랙스) — 비율 유지한 채 카메라 이동분만큼 키우고 세로는 가운데 크롭
    const bgScale = (Math.max(0, worldW - GAME_WIDTH) * 0.15 + GAME_WIDTH) / GAME_WIDTH;
    this.bg = this.add
      .image(0, GAME_HEIGHT / 2, `bg_${ch.bg}`)
      .setOrigin(0, 0.5)
      .setScrollFactor(0.15)
      .setScale(bgScale);

    if (ch.world) this.buildWorld(ch.world.width, ch.world.spawn);

    // 색조 오버레이 — 스프라이트·배경·CG 위, 대화창 아래
    this.tint = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0).setOrigin(0).setScrollFactor(0).setDepth(650).setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.audio = AudioManager.get(this);
    if (ch.bgm) this.audio.playBgm(ch.bgm);

    this.box = new DialogueBox(this);
    this.runner = new ScriptRunner(this, ch, this.box, this);
    this.overlay = new Overlay(this, {
      onToggle: (open) => (this.runner.inputBlocked = open),
      onTitle: () => this.scene.start("Title"),
    });

    if (ch.world && isTouchDevice()) this.touch = new TouchControls(this, () => this.tryInteract());

    this.buildHud();
    void this.showTitleCard().then(() => {
      if (ch.entry) void this.runner.run(ch.entry);
    });
  }

  update(): void {
    if (!this.player || !this.cursors || !this.keys) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    const locked = this.runner.running || this.overlay.isOpen;
    this.touch?.setVisible(!locked);
    if (locked) {
      body.setVelocityX(0);
      return;
    }

    const left = this.cursors.left.isDown || this.keys.a.isDown || !!this.touch?.left.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown || !!this.touch?.right.isDown;
    body.setVelocityX(left ? -PLAYER_SPEED : right ? PLAYER_SPEED : 0);
    if (left) this.player.setFlipX(true);
    if (right) this.player.setFlipX(false);

    this.updateTriggers();
  }

  // ---------- 월드 구성 ----------

  private buildWorld(width: number, spawn: number): void {
    // 나무 실루엣 (중간 패럴랙스) — 배경이 플레이스홀더일 때만
    const placeholders = (this.registry.get("placeholders") as string[] | undefined) ?? [];
    for (let x = 40; placeholders.includes(`bg_${this.chapter.bg}`) && x < width; x += 90 + ((x * 7) % 60)) {
      this.add.image(x, GROUND_Y + 8, "prop_tree").setOrigin(0.5, 1).setScrollFactor(0.6).setAlpha(0.7).setDepth(1);
    }
    // 바닥
    const ground = this.add.tileSprite(0, GROUND_Y, width, GAME_HEIGHT - GROUND_Y, "tile_ground").setOrigin(0).setDepth(2);
    this.physics.add.existing(ground, true);

    this.player = this.physics.add.sprite(spawn, GROUND_Y, "spr_noah").setOrigin(0.5, 1).setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    const kb = this.input.keyboard;
    if (!kb) return;
    this.cursors = kb.createCursorKeys();
    this.keys = { a: kb.addKey("A"), d: kb.addKey("D"), e: kb.addKey("E") };
    this.keys.e.on("down", () => this.tryInteract());
    kb.addKey("SPACE").on("down", () => this.tryInteract());

    for (const def of this.chapter.triggers ?? []) {
      const id = `${this.chapter.id}:${def.label}`;
      const view: TriggerView = { def, id, fired: def.once ? this.save.hasSeen(id) : false };
      if (def.sprite) {
        this.triggerSprites.push(this.add.image(def.x, GROUND_Y, `spr_${def.sprite}`).setOrigin(0.5, 1).setDepth(9).setName(def.sprite));
      }
      if (!def.auto) {
        view.hint = this.add
          .text(def.x, GROUND_Y - 120, def.hint ? `[E] ${def.hint}` : "[E]", {
            fontFamily: FONTS.mono,
            fontSize: "12px",
            color: PALETTE_CSS.bone,
            stroke: PALETTE_CSS.ink,
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(20)
          .setVisible(false);
      }
      this.triggers.push(view);
    }
  }

  private updateTriggers(): void {
    if (!this.player) return;
    const px = this.player.x;
    this.nearest = null;
    let best = INTERACT_RANGE;
    for (const tv of this.triggers) {
      const d = Math.abs(tv.def.x - px);
      const near = d < INTERACT_RANGE && !(tv.def.once && tv.fired);
      tv.hint?.setVisible(near);
      if (near && d < best) {
        best = d;
        this.nearest = tv;
      }
    }
    if (this.nearest?.def.auto) this.fire(this.nearest);
  }

  private tryInteract(): void {
    if (this.runner.running || this.overlay.isOpen || !this.nearest) return;
    this.fire(this.nearest);
  }

  private fire(tv: TriggerView): void {
    if (this.runner.running) return;
    tv.fired = true;
    if (tv.def.once) this.save.markSeen(tv.id);
    tv.hint?.setVisible(false);
    void this.runner.run(tv.def.label);
  }

  // ---------- HUD / 연출 ----------

  private chapterNumber(): string {
    const m = /^ch(\d+)$/.exec(this.chapter.id);
    return m ? m[1].padStart(2, "0") : "EP";
  }

  private buildHud(): void {
    const ch = this.chapter;
    this.add
      .text(16, 12, `${PART_NAMES[ch.part] ?? ""}  ·  ${this.chapterNumber()} ${ch.title}`, {
        fontFamily: FONTS.mono,
        fontSize: "11px",
        color: PALETTE_CSS.bone,
        stroke: PALETTE_CSS.ink,
        strokeThickness: 3,
      })
      .setAlpha(0.8)
      .setScrollFactor(0)
      .setDepth(900);

    {
      const hint = isTouchDevice()
        ? ch.world ? "◀ ▶ 이동 · ● 상호작용 · 탭 진행" : "탭 진행"
        : ch.world ? "← → 이동 · E 상호작용 · Space 진행 · L 로그 · Esc 메뉴" : "Space 진행 · Ctrl 스킵 · L 로그 · Esc 메뉴";
      this.add
        .text(GAME_WIDTH - 16, 12, hint, {
          fontFamily: FONTS.mono,
          fontSize: "11px",
          color: PALETTE_CSS.bone,
          stroke: PALETTE_CSS.ink,
          strokeThickness: 3,
        })
        .setAlpha(0.7)
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(900);
    }
  }

  private showTitleCard(): Promise<void> {
    const ch = this.chapter;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const veil = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.ink, 1).setOrigin(0).setScrollFactor(0).setDepth(2000);
    const num = this.add
      .text(cx, cy - 22, this.chapterNumber(), { fontFamily: FONTS.mono, fontSize: "14px", color: PALETTE_CSS.baelzRed })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2001)
      .setAlpha(0);
    const title = this.add
      .text(cx, cy + 8, ch.title, { fontFamily: FONTS.body, fontSize: "26px", color: PALETTE_CSS.bone })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2001)
      .setAlpha(0);

    return new Promise((resolve) => {
      this.tweens.chain({
        tweens: [
          { targets: [num, title], alpha: 1, duration: 600 },
          { targets: [num, title], alpha: 1, duration: 900 },
          { targets: [num, title], alpha: 0, duration: 500 },
          {
            targets: veil,
            alpha: 0,
            duration: 700,
            onComplete: () => {
              veil.destroy();
              num.destroy();
              title.destroy();
              resolve();
            },
          },
        ],
      });
    });
  }

  // ---------- StageHooks ----------

  setBackground(key: string): Promise<void> {
    return new Promise((resolve) => {
      this.cameras.main.fadeOut(300, 8, 8, 11);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.bg.setTexture(`bg_${key}`);
        this.cameras.main.fadeIn(300, 8, 8, 11);
        resolve();
      });
    });
  }

  showCg(key: string | null): Promise<void> {
    return new Promise((resolve) => {
      if (key === null) {
        if (!this.cg) return resolve();
        this.tweens.add({
          targets: this.cg,
          alpha: 0,
          duration: 400,
          onComplete: () => {
            this.cg?.destroy();
            this.cg = undefined;
            resolve();
          },
        });
        return;
      }
      const texKey = this.textures.exists(`cg_${key}`) ? `cg_${key}` : `bg_${this.chapter.bg}`;
      this.cg?.destroy();
      this.cg = this.add
        .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, texKey)
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setScrollFactor(0)
        .setDepth(600)
        .setAlpha(0);
      this.tweens.add({ targets: this.cg, alpha: 1, duration: 500, onComplete: () => resolve() });
    });
  }

  playBgm(key: string | null): void {
    this.audio.playBgm(key);
  }

  playSe(key: string): void {
    this.audio.playSe(key);
  }

  /** 표정 교체: 등장 중인 배우 또는 트리거 자리에 서 있는 스프라이트 */
  setFace(who: string, face: string): void {
    const tex = `spr_${face}`;
    if (!this.textures.exists(tex)) {
      console.warn(`[face] 스프라이트 없음: ${face}`);
      return;
    }
    const actor = this.actors.get(who);
    if (actor) {
      actor.setTexture(tex);
      return;
    }
    const base = SPEAKERS[who]?.sprite;
    for (const img of this.triggerSprites) if (img.name === base) img.setTexture(tex).setName(face);
  }

  fx(cmd: Extract<Cmd, { t: "fx" }>): Promise<void> {
    const cam = this.cameras.main;
    switch (cmd.kind) {
      case "shake":
        cam.shake(cmd.ms ?? 400, cmd.intensity ?? 0.008);
        return this.wait(cmd.ms ?? 400);
      case "flash": {
        const c = Phaser.Display.Color.HexStringToColor(cmd.color ?? "#ece3dd");
        cam.flash(cmd.ms ?? 300, c.red, c.green, c.blue);
        return this.wait(cmd.ms ?? 300);
      }
      case "tint":
        return this.setTone(cmd.tone, cmd.ms ?? 800);
    }
  }

  private setTone(tone: "cold" | "warm" | "chaos" | "none", ms: number): Promise<void> {
    this.chaosTimer?.remove(false);
    this.chaosTimer = undefined;
    if (tone === "chaos") {
      // 8장 폭주: 레드·시안이 번갈아 덮치고 흔들린다. ms 동안 지속 후 자동 해제.
      this.tint.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
      let flip = false;
      this.chaosTimer = this.time.addEvent({
        delay: 110,
        loop: true,
        callback: () => {
          flip = !flip;
          this.tint.setFillStyle(flip ? PALETTE.baelzRed : PALETTE.misaCyan, 0.35);
        },
      });
      this.cameras.main.shake(ms, 0.012);
      return this.wait(ms).then(() => this.setTone("none", 600));
    }
    this.tint.setBlendMode(Phaser.BlendModes.MULTIPLY);
    if (tone === "none") {
      return new Promise((r) => this.tweens.add({ targets: this.tint, fillAlpha: 0, duration: ms, onComplete: () => r() }));
    }
    this.tint.setFillStyle(TONES[tone], this.tint.fillAlpha);
    return new Promise((r) => this.tweens.add({ targets: this.tint, fillAlpha: 1, duration: ms, onComplete: () => r() }));
  }

  private wait(ms: number): Promise<void> {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }

  showActor(who: string, at: "left" | "center" | "right"): void {
    const spr = SPEAKERS[who]?.sprite ?? who;
    const x = at === "left" ? GAME_WIDTH * 0.25 : at === "right" ? GAME_WIDTH * 0.75 : GAME_WIDTH * 0.5;
    this.hideActor(who);
    // 발끝을 대화창 윗선에 맞춘다 (대화창 높이 150)
    const img = this.add
      .image(x, GAME_HEIGHT - 150 + 2, `spr_${spr}`)
      .setOrigin(0.5, 1)
      .setScale(1.5)
      .setScrollFactor(0)
      .setDepth(500)
      .setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 300 });
    this.actors.set(who, img);
  }

  hideActor(who: string): void {
    const img = this.actors.get(who);
    if (!img) return;
    this.actors.delete(who);
    this.tweens.add({ targets: img, alpha: 0, duration: 300, onComplete: () => img.destroy() });
  }

  gotoChapter(id: string): void {
    this.chaosTimer?.remove(false);
    this.cameras.main.fadeOut(600, 8, 8, 11);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.restart({ chapterId: id }));
  }

  endGame(): void {
    this.chaosTimer?.remove(false);
    this.audio.playBgm(null);
    this.cameras.main.fadeOut(1200, 8, 8, 11);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Title"));
  }
}
