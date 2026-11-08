#!/usr/bin/env node
// CppForge：錯誤圖鑑的自檢（不依賴伺服器）
//
// 為什麼需要：
//   圖鑑的價值建立在「看到這個錯誤 → 指到正確條目」。
//   如果某條目的 match 太寬鬆，它會搶走別人的錯誤，學員就得到錯的解釋 ——
//   這比沒有圖鑑更糟。
//
// 檢查三件事：
//   1. 自我命中：把每條自己的 symptom 餵進去，必須命中自己
//   2. 歧義：每條的 match 最多只能順帶命中幾條別人的 symptom（太寬鬆就報警）
//   3. 唯一性與欄位完整性（與內容 CI 重疊，但這裡可以單獨跑）
//
// 用法：node app/test/atlas.test.mjs

import { ENTRIES } from "../server/data/atlas.mjs";
import { matchAtlas } from "../server/atlas.mjs";

const failures = [];
const check = (ok, label, extra = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${extra ? `  ← ${extra}` : ""}`);
  if (!ok) failures.push(label);
};

console.log(`錯誤圖鑑自檢  ${ENTRIES.length} 條\n`);

// ── 1. 自我命中 ─────────────────────────────────────────────────────
console.log("【自我命中】把每條自己的 symptom 餵進去");
const selfMiss = [];
for (const e of ENTRIES) {
  const hit = matchAtlas(e.symptom, [], 5).map((x) => x.id);
  if (!hit.includes(e.id)) selfMiss.push(`${e.id}（命中 ${JSON.stringify(hit)}）`);
}
check(selfMiss.length === 0, "每條 symptom 都能命中自己",
  selfMiss.length ? selfMiss.join("; ") : "");

// ── 2. 歧義：會誤吃別人的 symptom 嗎 ────────────────────────────────
console.log("\n【歧義】每條的 pattern 會命中幾條「別的」條目的 symptom");
const ambiguous = [];
for (const e of ENTRIES) {
  const stolen = [];
  for (const other of ENTRIES) {
    if (other.id === e.id) continue;
    // 只餵 e 自己的 pattern，看會不會命中 other 的 symptom
    const hay = other.symptom.toLowerCase();
    if (e.match.some((m) => hay.includes(m.toLowerCase()))) stolen.push(other.id);
  }
  if (stolen.length > 2) ambiguous.push(`${e.id} 會吃掉 ${stolen.length} 條：${stolen.join(",")}`);
  const mark = stolen.length > 2 ? "FAIL" : "ok  ";
  console.log(`  ${mark}  ${e.id.padEnd(26)} 吃掉 ${stolen.length} 條${stolen.length ? `：${stolen.slice(0, 4).join(",")}` : ""}`);
}
check(ambiguous.length === 0, "沒有條目過度寬鬆（>2 條）", ambiguous.join("; "));

// ── 3. 真實訊息集合：一份「應該命中什麼」的清單 ─────────────────────
console.log("\n【實際輸出】用真實編譯器/執行期訊息驗證");
const REAL = [
  ["submission.cpp:6:22: error: expected ';' before '}' token", "missing-semicolon"],
  ["submission.cpp:9:1: error: expected '}' at end of input", "unmatched-brace"],
  ["submission.cpp:4:9: error: 'y' was not declared in this scope", "not-declared"],
  ["fatal error: iostream: No such file or directory", "missing-include"],
  ["error: no matching function for call to 'f(int)'", "no-matching-function"],
  ["error: cannot convert 'std::string' to 'int'", "cannot-convert"],
  ["error: passing 'const Foo' as 'this' argument discards qualifiers", "const-discards-qualifiers"],
  ["error: cannot bind non-const lvalue reference of type 'int&' to an rvalue", "non-const-ref-rvalue"],
  ["warning: comparison of integer expressions of different signedness", "signed-unsigned-compare"],
  ["error: narrowing conversion of '1000' from 'int' to 'char'", "narrowing"],
  ["ld.exe: undefined reference to `square_area(int)'", "undefined-reference"],
  ["ld.exe: multiple definition of `add(int, int)'", "multiple-definition"],
  ["collect2.exe: error: ld returned 1 exit status", null],
  ["exit code 0xC0000005 STATUS_ACCESS_VIOLATION", "segfault"],
  ["attempt to subscript container with out-of-bounds index 3", "out-of-bounds"],
  ["LEAKCHECK: 2 leaked block(s), 128 byte(s)", "leak"],
  ["LEAKCHECK: 2 double free(s)", "double-free"],
  ["exit code 0xC0000409 STATUS_STACK_BUFFER_OVERRUN", "stack-buffer-overrun"],
  ["逾時（>5000ms）", "timeout"],
  ["exit code 0xC0000094 integer division by zero", "division-by-zero"],
];
let okCount = 0;
for (const [hay, expect] of REAL) {
  const got = matchAtlas(hay, [], 5).map((x) => x.id);
  if (expect === null) {
    const ok = got.length === 0;
    if (ok) okCount++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${hay.slice(0, 46).padEnd(48)} → ${JSON.stringify(got)}（應為空）`);
    continue;
  }
  const ok = got.includes(expect);
  if (ok) okCount++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${hay.slice(0, 46).padEnd(48)} → ${JSON.stringify(got.slice(0, 3))}`);
}
check(okCount === REAL.length, `真實訊息命中率 ${okCount}/${REAL.length}`);

// ── 4. 反向：正常輸出必須零命中 ─────────────────────────────────────
console.log("\n【反向】正常輸出不得命中任何條目");
const NOISE = [
  "RUN  7 test(s)\n[ ok ] 開檔 → 寫入 → 內容可讀回\nTESTS: 7 passed, 0 failed",
  "sum=15 count=5 max=7",
  "compile=pass unit_test=pass runtime_safety=pass",
];
let noiseOk = 0;
for (const n of NOISE) {
  const got = matchAtlas(n, [], 3).map((x) => x.id);
  const ok = got.length === 0;
  if (ok) noiseOk++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${n.slice(0, 40).replace(/\n/g, "⏎").padEnd(42)} → ${JSON.stringify(got)}`);
}
check(noiseOk === NOISE.length, "正常輸出零命中");

console.log("");
if (failures.length) {
  console.log(`\x1b[31m${failures.length} 項失敗\x1b[0m`);
  process.exit(1);
}
console.log("\x1b[32m圖鑑自檢全部通過\x1b[0m");
