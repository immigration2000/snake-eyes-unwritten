import Phaser from "phaser";
import { Settings } from "./Settings";

const FADE_MS = 900;

/**
 * BGM 크로스페이드 + SE. Phaser 의 SoundManager 는 게임 전역이라
 * 씬이 restart 되어도 BGM 이 끊기지 않도록 모듈 싱글턴으로 관리한다.
 */
export class AudioManager {
  private static instance: AudioManager;
  private sound!: Phaser.Sound.BaseSoundManager;
  private scene!: Phaser.Scene;
  private current?: Phaser.Sound.BaseSound;
  private currentKey: string | null = null;
  private settings = Settings.get();

  static get(scene: Phaser.Scene): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
      AudioManager.instance.sound = scene.sound;
      AudioManager.instance.settings.onChange((s) => AudioManager.instance.applyVolume(s.bgmVolume));
    }
    // 트윈은 살아 있는 씬에서 돌려야 하므로 매번 갱신
    AudioManager.instance.scene = scene;
    return AudioManager.instance;
  }

  get bgmKey(): string | null {
    return this.currentKey;
  }

  playBgm(key: string | null): void {
    if (key === this.currentKey) return;
    const prev = this.current;
    this.current = undefined;
    this.currentKey = key;

    if (prev) {
      this.scene.tweens.add({
        targets: prev,
        volume: 0,
        duration: FADE_MS,
        onComplete: () => {
          prev.stop();
          prev.destroy();
        },
      });
    }

    if (!key) return;
    const cacheKey = `bgm_${key}`;
    if (!this.scene.cache.audio.exists(cacheKey)) {
      console.info(`[bgm] 에셋 없음, 건너뜀: ${key}`);
      return;
    }
    const next = this.sound.add(cacheKey, { loop: true, volume: 0 });
    next.play();
    this.current = next;
    this.scene.tweens.add({ targets: next, volume: this.settings.data.bgmVolume, duration: FADE_MS });
  }

  playSe(key: string): void {
    const cacheKey = `se_${key}`;
    if (!this.scene.cache.audio.exists(cacheKey)) {
      console.info(`[se] 에셋 없음, 건너뜀: ${key}`);
      return;
    }
    this.sound.play(cacheKey, { volume: this.settings.data.seVolume });
  }

  private applyVolume(v: number): void {
    if (this.current && "setVolume" in this.current) {
      (this.current as Phaser.Sound.WebAudioSound).setVolume(v);
    }
  }
}
