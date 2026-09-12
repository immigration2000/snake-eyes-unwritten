/**
 * 챕터 스크립트 포맷. 자세한 설명은 docs/04_스크립트_포맷.md
 * 한 챕터 = 하나의 JSON. script 는 label → 명령 배열.
 */
export type Cmd =
  | { t: "n"; text: string } // 나레이션
  | { t: "s"; who: string; text: string; face?: string } // 대사
  | { t: "choice"; options: ChoiceOption[] } // 선택지
  | { t: "goto"; label: string } // 다른 블록으로 점프
  | { t: "set"; key: string; value: string | number | boolean } // 플래그 설정
  | { t: "if"; key: string; eq: string | number | boolean; goto: string } // 조건 점프
  | { t: "bg"; key: string } // 배경 교체
  | { t: "cg"; key: string | null } // 삽화 표시/해제
  | { t: "bgm"; key: string | null } // BGM 교체/정지
  | { t: "pause"; ms: number } // 침묵 (§9-5)
  | { t: "show"; who: string; at: "left" | "center" | "right" } // 캐릭터 등장
  | { t: "hide"; who: string } // 캐릭터 퇴장
  | { t: "chapter"; id: string } // 다음 챕터로
  | { t: "end" }; // 게임 종료(엔딩 후)

export interface ChoiceOption {
  text: string;
  goto: string;
  set?: Record<string, string | number | boolean>;
}

export interface Trigger {
  /** 월드 x 좌표. 플레이어가 이 근처에 오면 상호작용 가능 */
  x: number;
  label: string;
  /** 접근만으로 자동 실행 (기본: E 키 입력 필요) */
  auto?: boolean;
  once?: boolean;
  hint?: string;
  /** 트리거 위치에 서 있는 캐릭터 스프라이트 키 */
  sprite?: string;
}

export interface Chapter {
  id: string;
  part: number;
  title: string;
  bg: string;
  bgm?: string;
  /** 사이드스크롤 월드 설정. 없으면 순수 VN 씬 */
  world?: { width: number; spawn: number };
  /** 챕터 진입 시 자동 실행할 label */
  entry?: string;
  triggers?: Trigger[];
  script: Record<string, Cmd[]>;
}

export type Flags = Record<string, string | number | boolean>;

export interface SaveData {
  chapterId: string;
  playerName: string;
  flags: Flags;
  seen: string[]; // once 트리거 완료 기록 "ch01:sign"
  savedAt: number;
}
