# SNAKE EYES — 아무도 적지 않은 나라

hololive Hakos Baelz 비영리 팬게임. Phaser 3 + TypeScript + Vite. 산나비식 사이드스크롤 탐색 + VN 대화.

## 먼저 읽을 것
- `docs/02_개발계획_로드맵.md` — 지금 어느 마일스톤인지, 다음 할 일
- `docs/04_스크립트_포맷.md` — 챕터 JSON 작성 규칙
- `docs/00_원본_통합자료.md` — 스토리 원본. **수정 금지.** 소설 §4 가 모든 대사의 출처

## 규칙
- 스토리 텍스트는 `src/data/chapters/*.json` 에만. 코드에 대사 넣지 않기.
- 소설 원문을 바꾸지 않는다. 쪼개고 `{name}` 치환만.
- 레드(`#ff2c3d`)는 벨즈 전용. 다른 캐릭터·UI 에 쓰지 않기.
- 커밋 전: `npm run validate:script && npm run typecheck`.
- 새 스크립트 명령 추가 순서: `data/types.ts` → `ScriptRunner.exec` → `StageHooks` → `ChapterScene` → `scripts/validate-chapters.mjs` 허용 목록 → `docs/04`.
- 에셋은 `public/assets/` + `manifest.json` 등록. 없으면 `BootScene` 플레이스홀더가 대신 그린다.

## 실행
`npm run dev` (Vite). 개발 모드에선 `window.__game` 으로 Phaser 인스턴스 접근 가능.
