# SNAKE EYES — 아무도 적지 않은 나라

> *The Unwritten Country* · 2D 픽셀 내러티브 어드벤처 · 비영리 팬게임 (hololive / Hakos Baelz)

세상이 "멸망의 징조"라 부른 뱀눈의 아이가 어떻게 마왕이 되었고, 어떻게 아무도 쫓겨나지 않는 나라를 세웠는지를 — 우연히 그 나라에 흘러든 떠돌이 기록자의 시선으로 다시 쓰는 이야기.

**장르**: 산나비 스타일 사이드스크롤 탐색 + 비주얼 노벨 대화. 전투 없음, 게임오버 없음.
**분량**: 5부 16장 + 에필로그, 90~120분. 14장 선택에 따른 3엔딩(연민 / 존중 / 경외) + 히든 씬.

**현재 상태 (v0.9)**: 전편 플레이 가능. 그래픽·음악은 플레이스홀더 (M5 에서 교체).

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
```

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입체크 + 프로덕션 빌드 (`dist/`) |
| `npm run validate:script` | 챕터 JSON 정합성 검사 (label/화자/챕터 참조) |
| `npm run typecheck` | `tsc --noEmit` |

**조작**: `← →` / `A D` 이동 · `E` 상호작용 · `Space` / `Enter` / 클릭 대사 진행 · `1~9` 선택지 · `Ctrl` 읽은 대사 스킵 · `L` / 휠↑ 백로그 · `Esc` 메뉴·설정

`http://localhost:5173/?chapter=ch03` 처럼 챕터로 바로 진입할 수 있다. `?chapter=demo` 는 연출 명령 데모.

`main` 에 push 하면 GitHub Actions 가 GitHub Pages 로 자동 배포한다.

## 프로젝트 구조

```
docs/                      기획·개발 문서 (아래 참고)
src/
  main.ts                  Phaser 부트스트랩
  config.ts                해상도·팔레트·폰트·화자(SPEAKERS)
  scenes/
    BootScene.ts           manifest 기반 에셋 로드 + 절차적 플레이스홀더
    TitleScene.ts          타이틀 / 새 이야기 / 이어서
    ChapterScene.ts        사이드스크롤 탐색 + 트리거 + VN 연출 훅
  systems/
    ScriptRunner.ts        챕터 스크립트 인터프리터 (+ 백로그, Ctrl 스킵)
    DialogueBox.ts         대화창 (타자 효과·선택지)
    RichText.ts            *이탤릭* 혼합 렌더
    AudioManager.ts        BGM 크로스페이드 · SE
    SaveManager.ts         localStorage 세이브 (챕터 체크포인트·플래그·읽은 줄)
    Settings.ts            텍스트 속도 · 볼륨
  ui/
    Overlay.ts             Esc 메뉴 · 백로그 · 설정
    NameInput.ts           이름 입력 (DOM)
  data/
    types.ts               스크립트 명령 타입
    chapters/chNN.json     챕터별 스크립트 (스토리 데이터)
public/assets/             bg / sprites / cg / audio / manifest.json
scripts/validate-chapters.mjs
```

## 문서

| 문서 | 내용 |
|---|---|
| [00_원본_통합자료.md](docs/00_원본_통합자료.md) | 세계관·캐릭터·소설 전문·에셋 프롬프트·BGM 가이드 (원본, 수정 금지) |
| [01_기획서_GDD.md](docs/01_기획서_GDD.md) | 게임 디자인 문서 — 장르·핵심 루프·씬 설계·엔딩 |
| [02_개발계획_로드맵.md](docs/02_개발계획_로드맵.md) | 마일스톤 M0~M5, 작업 순서, 완료 기준 |
| [03_기술설계.md](docs/03_기술설계.md) | 엔진 선택 이유, 아키텍처, 씬/시스템 책임 |
| [04_스크립트_포맷.md](docs/04_스크립트_포맷.md) | 챕터 JSON 작성법 (소설 → 스크립트 변환 규칙) |

## 저작권

- 비영리 2차 창작. 상업적 배포·판매 금지.
- Cover Corp [hololive 2차 창작 가이드라인](https://hololivepro.com/terms/) 준수.
- 코드(`src/`, `scripts/`)는 MIT. 스토리·캐릭터·아트는 팬 창작물로 위 가이드라인을 따른다.
