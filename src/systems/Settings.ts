const KEY = "snake-eyes-unwritten:settings:v1";

export interface SettingsData {
  /** 타자 속도 (글자/초) */
  textSpeed: number;
  bgmVolume: number; // 0~1
  seVolume: number; // 0~1
}

export const TEXT_SPEEDS = [25, 40, 70, 999] as const; // 느림 / 보통 / 빠름 / 즉시
export const TEXT_SPEED_LABELS = ["느림", "보통", "빠름", "즉시"] as const;

const DEFAULTS: SettingsData = { textSpeed: 40, bgmVolume: 0.7, seVolume: 0.8 };

/** localStorage 기반 설정. 값이 바뀌면 리스너에 통지 (볼륨 즉시 반영용). */
export class Settings {
  private static instance: Settings;
  data: SettingsData;
  private listeners = new Set<(s: SettingsData) => void>();

  private constructor() {
    let stored: Partial<SettingsData> = {};
    try {
      stored = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<SettingsData>;
    } catch {
      /* ignore */
    }
    this.data = { ...DEFAULTS, ...stored };
  }

  static get(): Settings {
    if (!Settings.instance) Settings.instance = new Settings();
    return Settings.instance;
  }

  set<K extends keyof SettingsData>(key: K, value: SettingsData[K]): void {
    this.data[key] = value;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
    this.listeners.forEach((l) => l(this.data));
  }

  onChange(fn: (s: SettingsData) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
