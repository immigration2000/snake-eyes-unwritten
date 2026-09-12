// 챕터 JSON 을 "명령 한 줄" 스타일로 정리. 사용: node scripts/format-chapters.mjs [ch04 ...]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "src/data/chapters";
const only = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".json") && (only.length === 0 || only.includes(f.replace(".json", ""))));

const one = (v) => JSON.stringify(v).replace(/,"/g, ', "').replace(/":/g, '": ').replace(/\{"/g, '{ "').replace(/"\}/g, '" }').replace(/\]\}/g, "] }").replace(/\}\}/g, "} }").replace(/\[\{/g, "[ {").replace(/\},\{/g, "}, {").replace(/\}\]/g, "} ]").replace(/(\d)\}/g, "$1 }").replace(/(true|false|null)\}/g, "$1 }");

for (const f of files) {
  const ch = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const head = Object.entries(ch).filter(([k]) => !["triggers", "script"].includes(k));
  let out = "{\n";
  out += head.map(([k, v]) => `  "${k}": ${one(v)}`).join(",\n");
  if (ch.triggers) out += `,\n  "triggers": [\n${ch.triggers.map((t) => "    " + one(t)).join(",\n")}\n  ]`;
  out += `,\n  "script": {\n`;
  out += Object.entries(ch.script)
    .map(([label, cmds]) => `    "${label}": [\n${cmds.map((c) => "      " + one(c)).join(",\n")}\n    ]`)
    .join(",\n");
  out += "\n  }\n}\n";
  writeFileSync(join(dir, f), out);
  console.log("formatted", f);
}
