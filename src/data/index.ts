import type { Chapter } from "./types";
import ch01 from "./chapters/ch01.json";
import ch02 from "./chapters/ch02.json";
import ch03 from "./chapters/ch03.json";
import demo from "./chapters/demo.json";

/** 챕터 레지스트리. 새 챕터를 추가하면 여기에 등록. 순서 = 진행 순서. */
export const CHAPTERS: Chapter[] = [ch01, ch02, ch03] as Chapter[];

/** 진행 순서에 없는 개발용 챕터 (?chapter=demo) */
const EXTRA: Chapter[] = [demo] as Chapter[];

const byId = new Map([...CHAPTERS, ...EXTRA].map((c) => [c.id, c]));

export function getChapter(id: string): Chapter | undefined {
  return byId.get(id);
}
