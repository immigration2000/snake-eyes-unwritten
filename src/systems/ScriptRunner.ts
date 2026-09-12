import Phaser from "phaser";
import type { Chapter, Cmd } from "@/data/types";
import { DialogueBox } from "./DialogueBox";
import { SaveManager, SeenLines } from "./SaveManager";

/** 씬이 ScriptRunner 에 제공해야 하는 연출 훅 */
export interface StageHooks {
  setBackground(key: string): Promise<void> | void;
  showCg(key: string | null): Promise<void> | void;
  playBgm(key: string | null): void;
  playSe(key: string): void;
  showActor(who: string, at: "left" | "center" | "right"): void;
  hideActor(who: string): void;
  setFace(who: string, face: string): void;
  fx(cmd: Extract<Cmd, { t: "fx" }>): Promise<void> | void;
  gotoChapter(id: string): void;
  endGame(): void;
}

export interface BacklogLine {
  who: string | null;
  text: string;
}

/** 최근 대사 기록 (백로그 UI 용). 씬을 넘어 유지. */
export const Backlog = {
  lines: [] as BacklogLine[],
  push(line: BacklogLine): void {
    Backlog.lines.push(line);
    if (Backlog.lines.length > 60) Backlog.lines.shift();
  },
};

type Jump = string | "__stop__" | null;

/**
 * 챕터 스크립트 인터프리터.
 * run(label) 로 블록을 실행하고, 블록이 끝나면 resolve → 씬이 플레이어 조작을 돌려준다.
 */
export class ScriptRunner {
  private scene: Phaser.Scene;
  private chapter: Chapter;
  private box: DialogueBox;
  private hooks: StageHooks;
  private save = SaveManager.get();
  private ctrl?: Phaser.Input.Keyboard.Key;
  running = false;
  /** 백로그·설정 등 오버레이가 열려 있는 동안 진행 입력을 무시 */
  inputBlocked = false;

  constructor(scene: Phaser.Scene, chapter: Chapter, box: DialogueBox, hooks: StageHooks) {
    this.scene = scene;
    this.chapter = chapter;
    this.box = box;
    this.hooks = hooks;
    this.ctrl = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
  }

  async run(label: string): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      let next: string | null = label;
      while (next) next = await this.runBlock(next);
    } finally {
      this.running = false;
      this.box.hide();
    }
  }

  /** 블록 실행. goto 가 나오면 다음 label 반환, 끝까지 가면 null. */
  private async runBlock(label: string): Promise<string | null> {
    const cmds = this.chapter.script[label];
    if (!cmds) {
      console.warn(`[script] label 없음: ${this.chapter.id}:${label}`);
      return null;
    }
    for (let i = 0; i < cmds.length; i++) {
      const jump = await this.exec(cmds[i], `${this.chapter.id}:${label}:${i}`);
      if (jump === "__stop__") return null;
      if (jump) return jump;
    }
    return null;
  }

  private async exec(cmd: Cmd, lineId: string): Promise<Jump> {
    switch (cmd.t) {
      case "n":
        await this.line(null, cmd.text, lineId);
        return null;
      case "s":
        if (cmd.face) this.hooks.setFace(cmd.who, cmd.face);
        await this.line(cmd.who, cmd.text, lineId);
        return null;
      case "choice": {
        const picked = await this.box.choices(cmd.options.map((o) => ({ ...o, text: this.interp(o.text) })));
        Backlog.push({ who: null, text: `▸ ${picked.text}` });
        if (picked.set) for (const [k, v] of Object.entries(picked.set)) this.save.setFlag(k, v);
        return picked.goto;
      }
      case "goto":
        return cmd.label;
      case "set":
        this.save.setFlag(cmd.key, cmd.value);
        return null;
      case "if":
        return this.save.getFlag(cmd.key) === cmd.eq ? cmd.goto : null;
      case "bg":
        await this.hooks.setBackground(cmd.key);
        return null;
      case "cg":
        await this.hooks.showCg(cmd.key);
        return null;
      case "bgm":
        this.hooks.playBgm(cmd.key);
        return null;
      case "se":
        this.hooks.playSe(cmd.key);
        return null;
      case "fx":
        this.box.hide(); // 효과는 대사 없이 화면만 보이게
        await this.hooks.fx(cmd);
        return null;
      case "face":
        this.hooks.setFace(cmd.who, cmd.face);
        return null;
      case "pause":
        this.box.hide();
        await this.delay(this.skipping(true) ? Math.min(cmd.ms, 150) : cmd.ms);
        return null;
      case "show":
        this.hooks.showActor(cmd.who, cmd.at);
        return null;
      case "hide":
        this.hooks.hideActor(cmd.who);
        return null;
      case "chapter":
        this.box.hide();
        this.hooks.gotoChapter(cmd.id);
        return "__stop__";
      case "end":
        this.box.hide();
        this.hooks.endGame();
        return "__stop__";
    }
  }

  /** 대사 한 줄: 표시 → 백로그·읽음 기록 → 진행 입력 대기 (스킵 중이면 자동) */
  private async line(who: string | null, raw: string, lineId: string): Promise<void> {
    const text = this.interp(raw);
    const seen = SeenLines.has(lineId);
    const typed = this.box.say(who, text, this.skipping(seen));
    Backlog.push({ who, text });
    SeenLines.mark(lineId);
    if (this.skipping(seen)) {
      await typed;
      await this.delay(60);
      return;
    }
    // 타자 중 입력 = 타자 건너뛰기, 타자 끝난 뒤 입력 = 다음 줄
    await Promise.all([typed, this.waitAdvance(() => this.skipping(seen))]);
  }

  /** Ctrl 을 누르고 있고 이미 읽은 줄이면 스킵 */
  private skipping(seen: boolean): boolean {
    return seen && !!this.ctrl?.isDown;
  }

  /** {name} 치환 */
  private interp(text: string): string {
    return text.replace(/\{name\}/g, this.save.data.playerName);
  }

  /** 클릭/스페이스/엔터 대기. 타자 중이면 먼저 스킵. autoIf 가 true 를 돌려주면 자동 진행. */
  private waitAdvance(autoIf: () => boolean): Promise<void> {
    return new Promise((resolve) => {
      const kb = this.scene.input.keyboard;
      const onKey = (e: KeyboardEvent) => {
        if (e.code === "Space" || e.code === "Enter") advance();
      };
      const onPointer = (p: Phaser.Input.Pointer) => {
        if (p.leftButtonDown() || p.wasTouch) advance();
      };
      const poll = this.scene.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          if (autoIf()) {
            this.box.skipTyping();
            done();
          }
        },
      });
      const advance = () => {
        if (this.inputBlocked) return;
        if (this.box.skipTyping()) return;
        done();
      };
      const done = () => {
        kb?.off("keydown", onKey);
        this.scene.input.off("pointerdown", onPointer);
        poll.remove(false);
        resolve();
      };
      kb?.on("keydown", onKey);
      this.scene.input.on("pointerdown", onPointer);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => this.scene.time.delayedCall(ms, r));
  }
}
