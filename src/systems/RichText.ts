import Phaser from "phaser";

export interface Segment {
  text: string;
  italic: boolean;
}

/** `*...*` 마커를 이탤릭 세그먼트로 분리 (§9-4). */
export function parseMarkup(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /\*(.+?)\*/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index), italic: false });
    out.push({ text: m[1], italic: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), italic: false });
  return out;
}

interface Chunk {
  obj: Phaser.GameObjects.Text;
  full: string;
}

/**
 * 세그먼트 단위 스타일(이탤릭·색)을 지원하는 줄바꿈 텍스트.
 * Phaser Text 는 서식 혼합이 안 되므로 단어 단위로 재서 직접 배치한다.
 * 타자 효과는 reveal(n) 으로 앞에서부터 n글자만 보이게.
 */
export class RichText {
  readonly container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private maxWidth: number;
  private base: Phaser.Types.GameObjects.Text.TextStyle;
  private italicStyle: Phaser.Types.GameObjects.Text.TextStyle;
  private lineHeight: number;
  private measure: Phaser.GameObjects.Text;
  private measureItalic: Phaser.GameObjects.Text;
  private chunks: Chunk[] = [];
  total = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, maxWidth: number, base: Phaser.Types.GameObjects.Text.TextStyle, italicColor: string) {
    this.scene = scene;
    this.maxWidth = maxWidth;
    this.base = base;
    this.italicStyle = { ...base, fontStyle: "italic", color: italicColor };
    this.lineHeight = parseInt(String(base.fontSize ?? "16"), 10) * 1.35 + 6;
    this.container = scene.add.container(x, y);
    this.measure = scene.add.text(0, 0, "", base).setVisible(false);
    this.measureItalic = scene.add.text(0, 0, "", this.italicStyle).setVisible(false);
  }

  setContent(text: string): void {
    this.clear();
    const segs = parseMarkup(text);
    let x = 0;
    let line = 0;
    let cur: { seg: Segment; text: string; x: number; line: number } | null = null;
    const flush = () => {
      if (!cur || !cur.text) return;
      const obj = this.scene.add.text(cur.x, cur.line * this.lineHeight, "", cur.seg.italic ? this.italicStyle : this.base);
      this.container.add(obj);
      this.chunks.push({ obj, full: cur.text });
      cur = null;
    };
    const place = (seg: Segment, word: string) => {
      const w = this.width(word, seg.italic);
      if (x + w > this.maxWidth && x > 0) {
        flush();
        line++;
        x = 0;
        if (/^\s+$/.test(word)) return; // 줄머리 공백 버림
      }
      if (!cur || cur.seg !== seg || cur.line !== line) {
        flush();
        cur = { seg, text: "", x, line };
      }
      cur.text += word;
      x += w;
    };

    for (const seg of segs) {
      for (const word of seg.text.split(/(\s+)/).filter(Boolean)) {
        if (this.width(word, seg.italic) > this.maxWidth) {
          // 공백 없는 긴 한글 문장 → 글자 단위로
          for (const ch of word) place(seg, ch);
        } else {
          place(seg, word);
        }
      }
    }
    flush();
    this.total = this.chunks.reduce((n, c) => n + c.full.length, 0);
    this.reveal(0);
  }

  reveal(n: number): void {
    let left = n;
    for (const c of this.chunks) {
      const k = Math.max(0, Math.min(c.full.length, left));
      c.obj.setText(c.full.slice(0, k));
      left -= c.full.length;
    }
  }

  revealAll(): void {
    this.reveal(this.total);
  }

  /** 현재까지 보이는 텍스트 (디버그·백로그용) */
  get plain(): string {
    return this.chunks.map((c) => c.full).join("");
  }

  clear(): void {
    this.container.removeAll(true);
    this.chunks = [];
    this.total = 0;
  }

  setVisible(v: boolean): void {
    this.container.setVisible(v);
  }

  private width(text: string, italic: boolean): number {
    const m = italic ? this.measureItalic : this.measure;
    m.setText(text);
    return m.width;
  }
}
