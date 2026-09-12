// 챕터 JSON 정합성 검사: goto/label 참조, chapter 참조, 화자 키, 트리거 label 존재 여부.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = "src/data/chapters";
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const chapters = files.map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
const ids = new Set(chapters.map((c) => c.id));

// SPEAKERS 키는 config.ts 에서 추출 (간이 파싱)
const cfg = readFileSync("src/config.ts", "utf8");
const speakers = new Set([...cfg.matchAll(/^\s+"?([\w?]+)"?:\s*\{ name:/gm)].map((m) => m[1]));
// 스프라이트 키 = BootScene 플레이스홀더 목록 ∪ manifest.sprites
const boot = readFileSync("src/scenes/BootScene.ts", "utf8");
const manifest = JSON.parse(readFileSync("public/assets/manifest.json", "utf8"));
const sprites = new Set([...[...boot.matchAll(/^\s+(\w+): \{ body:/gm)].map((m) => m[1]), ...(manifest.sprites ?? [])]);

let errors = 0;
const err = (msg) => { console.error("  ✗ " + msg); errors++; };

for (const ch of chapters) {
  console.log(`${ch.id} — ${ch.title}`);
  const labels = new Set(Object.keys(ch.script));
  const checkLabel = (l, where) => { if (!labels.has(l)) err(`${where}: label '${l}' 없음`); };

  if (ch.entry) checkLabel(ch.entry, "entry");
  for (const tr of ch.triggers ?? []) checkLabel(tr.label, `trigger x=${tr.x}`);

  for (const [label, cmds] of Object.entries(ch.script)) {
    cmds.forEach((c, i) => {
      const where = `${label}[${i}]`;
      switch (c.t) {
        case "goto": checkLabel(c.label, where); break;
        case "if": checkLabel(c.goto, where); break;
        case "choice":
          if (!c.options?.length) err(`${where}: 선택지 비어 있음`);
          for (const o of c.options ?? []) checkLabel(o.goto, where);
          break;
        case "s":
          if (!speakers.has(c.who)) err(`${where}: 화자 '${c.who}' 가 SPEAKERS 에 없음`);
          if (c.face && !sprites.has(c.face)) err(`${where}: face '${c.face}' 스프라이트 없음`);
          break;
        case "face":
          if (!speakers.has(c.who)) err(`${where}: 화자 '${c.who}' 가 SPEAKERS 에 없음`);
          if (!sprites.has(c.face)) err(`${where}: face '${c.face}' 스프라이트 없음`);
          break;
        case "fx":
          if (!["shake", "flash", "tint"].includes(c.kind)) err(`${where}: fx kind '${c.kind}' 없음`);
          if (c.kind === "tint" && !["cold", "warm", "chaos", "none"].includes(c.tone)) err(`${where}: tint tone '${c.tone}' 없음`);
          break;
        case "se": if (typeof c.key !== "string") err(`${where}: se key 없음`); break;
        case "show": case "hide": if (!speakers.has(c.who)) err(`${where}: 화자 '${c.who}' 가 SPEAKERS 에 없음`); break;
        case "chapter": if (!ids.has(c.id)) err(`${where}: 챕터 '${c.id}' 없음`); break;
        case "n": case "set": case "bg": case "cg": case "bgm": case "pause": case "end": break;
        default: err(`${where}: 알 수 없는 명령 '${c.t}'`);
      }
    });
  }
}

if (errors) { console.error(`\n${errors}개 오류`); process.exit(1); }
console.log(`\n✓ ${chapters.length}개 챕터 검사 통과`);
