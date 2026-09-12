import Phaser from "phaser";
import type { Chapter, Cmd } from "@/data/types";
import { DialogueBox } from "./DialogueBox";
import { SaveManager } from "./SaveManager";

/** 씬이 ScriptRunner 에 제공해야 하는 연출 훅 */
export interface StageHooks {
  setBackground(key: string): Promise<void> | void;
  showCg(key: string | null): Promise<void> | void;
  playBgm(key: string | null): void;
  showActor(who: string, at: "left" | "center" | "right"): void;
  hideActor(who: string): void;
  gotoChapter(id: string): void;
  endGame(): void;
}

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
  running = false;

  constructor(scene: Phaser.Scene, chapter: Chapter, box: DialogueBox, hooks: StageHooks) {
    this.scene = scene;
    this.chapter = chapter;
    this.box = box;
    this.hooks = hooks;
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
    for (const cmd of cmds) {
      const jump = await this.exec(cmd);
      if (jump === "__stop__") return null;
      if (jump) return jump;
    }
    return null;
  }

  private async exec(cmd: Cmd): Promise<string | null> {
    switch (cmd.t) {
      case "n":
        await this.box.say(null, this.interp(cmd.text));
        await this.waitAdvance();
        return null;
      case "s":
        await this.box.say(cmd.who, this.interp(cmd.text));
        await this.waitAdvance();
        return null;
      case "choice": {
        const picked = await this.box.choices(cmd.options.map((o) => ({ ...o, text: this.interp(o.text) })));
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
      case "pause":
        this.box.hide();
        await this.delay(cmd.ms);
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

  /** {name} 치환 */
  private interp(text: string): string {
    return text.replace(/\{name\}/g, this.save.data.playerName);
  }

  /** 클릭/스페이스/엔터 대기. 타자 중이면 먼저 스킵. */
  private waitAdvance(): Promise<void> {
    return new Promise((resolve) => {
      const kb = this.scene.input.keyboard;
      const onKey = (e: KeyboardEvent) => {
        if (e.code === "Space" || e.code === "Enter") advance();
      };
      const onPointer = () => advance();
      const advance = () => {
        if (this.box.skipTyping()) return;
        kb?.off("keydown", onKey);
        this.scene.input.off("pointerdown", onPointer);
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
