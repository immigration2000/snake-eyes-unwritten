import { SAVE_KEY } from "@/config";
import type { Flags, SaveData } from "@/data/types";

/** localStorage 기반 단일 슬롯 세이브. 챕터 단위 체크포인트. */
export class SaveManager {
  private static instance: SaveManager;
  data: SaveData;

  private constructor() {
    this.data = SaveManager.load() ?? SaveManager.fresh();
  }

  static get(): SaveManager {
    if (!SaveManager.instance) SaveManager.instance = new SaveManager();
    return SaveManager.instance;
  }

  static fresh(): SaveData {
    return { chapterId: "ch01", playerName: "노아", flags: {}, seen: [], savedAt: 0 };
  }

  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? (JSON.parse(raw) as SaveData) : null;
    } catch {
      return null;
    }
  }

  get hasSave(): boolean {
    return this.data.savedAt > 0;
  }

  newGame(playerName: string): void {
    this.data = SaveManager.fresh();
    this.data.playerName = playerName || "노아";
    this.persist();
  }

  checkpoint(chapterId: string): void {
    this.data.chapterId = chapterId;
    this.persist();
  }

  setFlag(key: string, value: Flags[string]): void {
    this.data.flags[key] = value;
    this.persist();
  }

  getFlag(key: string): Flags[string] | undefined {
    return this.data.flags[key];
  }

  markSeen(id: string): void {
    if (!this.data.seen.includes(id)) {
      this.data.seen.push(id);
      this.persist();
    }
  }

  hasSeen(id: string): boolean {
    return this.data.seen.includes(id);
  }

  private persist(): void {
    this.data.savedAt = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      /* 사생활 모드 등 — 저장 실패는 무시 */
    }
  }
}
