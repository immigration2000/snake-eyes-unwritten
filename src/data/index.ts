import type { Chapter } from "./types";
import ch01 from "./chapters/ch01.json";
import ch02 from "./chapters/ch02.json";
import ch03 from "./chapters/ch03.json";
import ch04 from "./chapters/ch04.json";
import ch05 from "./chapters/ch05.json";
import ch06 from "./chapters/ch06.json";
import ch07 from "./chapters/ch07.json";
import ch08 from "./chapters/ch08.json";
import demo from "./chapters/demo.json";

/** 챕터 레지스트리. 새 챕터를 추가하면 여기에 등록. 순서 = 진행 순서. */
export const CHAPTERS: Chapter[] = [ch01, ch02, ch03, ch04, ch05, ch06, ch07, ch08] as Chapter[];

/** 진행 순서에 없는 개발용 챕터 (?chapter=demo) */
const EXTRA: Chapter[] = [demo] as Chapter[];

const byId = new Map([...CHAPTERS, ...EXTRA].map((c) => [c.id, c]));

export function getChapter(id: string): Chapter | undefined {
  return byId.get(id);
}
