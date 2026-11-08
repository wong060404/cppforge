#!/usr/bin/env node
// CppForge：內容 CI（把 POC 驗證過的四條規則產品化）
//
// 每個節點都必須滿足：
//   1. .meta/solution.cpp 全數通過所有 grader      → 題目本身沒壞
//   2. starter.cpp 「能編譯但測試失敗」             → 學員不會一開局就卡死
//      （除節點明確標記 starterFailsCompile，代表「修編譯錯誤」就是練習本身）
//   3. 內容格式通過 lint（先修存在、無環、檔案齊全）
//   4. 每節都有課文與目標
//
// 用法：node app/server/verify-content.mjs [--only L1.02]

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { lintContent, scanNodes } from "./content.mjs";
import { evaluateNode } from "./grading.mjs";
import { ENTRIES } from "./data/atlas.mjs";

/** 錯誤圖鑑的結構檢查：id 唯一、必要欄位齊全、match 不能過短（會誤匹配） */
function lintAtlas() {
  const problems = [];
  const ids = new Set();
  const required = ["id", "stage", "match", "title", "symptom", "why", "fixes", "bad", "good"];
  for (const e of ENTRIES) {
    if (ids.has(e.id)) problems.push(`圖鑑 id 重複：${e.id}`);
    ids.add(e.id);
    for (const k of required) {
      if (e[k] === undefined) problems.push(`圖鑑 ${e.id} 缺欄位 ${k}`);
    }
    if (!Array.isArray(e.match) || e.match.length === 0) {
      problems.push(`圖鑑 ${e.id} 沒有 match 樣式`);
    } else if (e.match.some((m) => !m || m.trim().length < 3)) {
      problems.push(`圖鑑 ${e.id} 有過短的 match（會誤匹配）`);
    }
    if (Array.isArray(e.fixes) && e.fixes.length === 0) problems.push(`圖鑑 ${e.id} 沒有修法`);
  }
  return problems;
}

const only = (() => {
  const i = process.argv.indexOf("--only");
  return i >= 0 ? process.argv[i + 1] : null;
})();

const ok = (s) => (s ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m");
async function main() {
  const lint = await lintContent();
  const atlasProblems = lintAtlas();
  console.log(`內容 lint：${lint.nodeCount} 個節點，${lint.problems.length} 個問題`);
  for (const p of lint.problems) console.log(`  - ${p}`);
  console.log(`錯誤圖鑑：${ENTRIES.length} 條，${atlasProblems.length} 個問題`);
  for (const p of atlasProblems) console.log(`  - ${p}`);

  let nodes = await scanNodes();
  if (only) nodes = nodes.filter((n) => n.id === only);

  const rows = [];
  let failures = 0;

  for (const node of nodes) {
    // 一般節點：starter.cpp / .meta/solution.cpp
    // 標頭檔節點：submission.hpp / .meta/submission.hpp（模板必須在標頭檔）
    const starterName = node.submissionName ?? "starter.cpp";
    const solutionName = node.submissionName ?? "solution.cpp";
    const solutionPath = path.join(node.dir, ".meta", solutionName);
    const starterPath = path.join(node.dir, starterName);
    const solution = await readFile(solutionPath, "utf8").catch(() => null);
    const starter = await readFile(starterPath, "utf8").catch(() => null);

    const results = { id: node.id, title: node.title };

    if (!solution || !starter) {
      results.solution = false;
      results.starter = false;
      results.note = "缺少 solution 或 starter";
      rows.push(results);
      failures += 1;
      continue;
    }

    const solReport = await evaluateNode(node, solution);
    results.solution = solReport.passed === true;
    results.solutionNote = solReport.results.map((r) => `${r.id}=${r.status}`).join(" ");

    const startReport = await evaluateNode(node, starter);
    const compileCheck = startReport.results.find((r) => r.id === "compile");
    const starterCompiled = compileCheck?.status === "pass";

    if (node.starterFailsCompile) {
      results.starter = startReport.passed === false && starterCompiled === false;
      results.starterNote = "故意編譯失敗（練習本身就是修錯誤）";
    } else {
      results.starter = startReport.passed === false && starterCompiled === true;
      results.starterNote = starterCompiled ? "編譯過但測試失敗" : "⚠ 起始碼編不過";
    }

    // 課文宣稱「N 個地方漏了」——用「失敗訊號數」驗證這個宣稱。
    // 訊號 = 失敗的單元測試數 + （記憶體檢查也失敗 ? 1 : 0）。
    // 為什麼要加後面那項：有些錯（例如賦值時忘了釋放舊資料）**不會讓任何測試失敗**，
    // 只有洩漏檢查抓得到。只用測試數會誤判成「宣稱不實」。
    // 這是下限檢查：一錯可能造成多個測試失敗，所以超過 bugCount 是正常的。
    if (node.bugCount) {
      // 有單元測試就用它；只有 io_match 的節點則把每組測資算一個訊號
      const ut = startReport.results.find((r) => r.id === "unit_test")
        ?? startReport.results.find((r) => r.id === "io_match");
      const rt = startReport.results.find((r) => r.id === "runtime_safety");
      const failedTests = ut?.metrics?.failed ?? 0;
      // 只有「真的發現安全問題」才計為額外訊號。
      // 「測試沒過 → 安全檢查無定論」不算（那只是同一批 bug 的副作用）。
      const safetyFinding = rt?.status === "fail"
        && /洩漏|重複釋放|崩潰|逾時/.test(rt.detail ?? "");
      const signals = failedTests + (safetyFinding ? 1 : 0);
      results.bugs = signals >= node.bugCount;
      results.bugNote = `宣稱 ${node.bugCount} 個錯；訊號 = ${failedTests} 個失敗測試`
        + (safetyFinding ? " + 記憶體檢查發現問題" : "") + ` = ${signals}`;
      if (!results.bugs) failures += 1;
    }

    if (!results.solution || !results.starter) failures += 1;
    rows.push(results);
    process.stdout.write(`\r  評測中… ${rows.length}/${nodes.length}`);
  }
  process.stdout.write("\n\n");

  console.log(`\n${"節點".padEnd(8)}${"參考解  起始碼  "}標題 / 備註`);
  console.log("-".repeat(88));
  for (const r of rows) {
    const note = r.note ?? (r.solution ? "" : r.solutionNote ?? "");
    const bug = r.bugs === undefined ? "" : (r.bugs ? "  · 錯 " : "  · ⚠ 錯 ") + r.bugNote;
    console.log(`${r.id.padEnd(8)}${ok(r.solution)}  ${ok(r.starter)}  ${r.title}${note ? `  ← ${note}` : ""}${bug}`);
  }
  console.log("-".repeat(88));
  const allGood = failures === 0 && lint.problems.length === 0 && atlasProblems.length === 0;
  console.log(allGood
    ? `\x1b[32m內容 CI 全部通過\x1b[0m（${rows.length} 個節點、${ENTRIES.length} 條圖鑑）`
    : `\x1b[31m有 ${failures} 個節點未通過、${lint.problems.length + atlasProblems.length} 個 lint 問題\x1b[0m`);

  process.exit(allGood ? 0 : 1);
}

await main();
