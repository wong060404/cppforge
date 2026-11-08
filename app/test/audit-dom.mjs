/**
 * 前端審計：用 jsdom 建立**真實 DOM**，載入真的 index.html 並執行真的 app.js，
 * 然後逐一開啟全部節點、操作提示/練習/評測/圖鑑/環境檢查/複習。
 *
 * 為什麼不只用 app/test/dom-smoke.mjs：
 *   那個是手寫的 DOM shim，只實作了我想到的 API —— 之前
 *   `querySelectorAll(...).find()` 的 bug 就是被 shim 放過的。
 *   jsdom 是規格實作，會抓到這類問題，也會回報未捕捉的例外。
 *
 * 這是**選用**測試（jsdom 不是本專案的依賴）。用法：
 *   npm i jsdom                 （在任意目錄，或全域）
 *   node app/server/index.mjs   （另開終端）
 *   node app/test/audit-dom.mjs [--base URL] [--jsdom PATH]
 *
 * 沒有前置條件：所有節點都自由存取，任何一節都能直接開、直接執行。
 * 這個測試自己會驗這件事（先開最後一節、而且不經過任何前面的節點）。
 *
 * ⚠ 這個測試會**寫入真實資料**：它會按「還原」（清掉該節草稿）、
 *   在編輯器裡打測試字串（變成伺服器草稿）、並送一次評測。
 *   要跑在乾淨環境請另開一個暫存資料庫：
 *
 *     $env:CPPFORGE_DB = "$env:TEMP\cppforge-audit.db"
 *     node app/server/index.mjs
 */
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const BASE = argOf("--base", process.env.CPPFORGE_URL ?? "http://127.0.0.1:4173");
const JSDOM_PATH = argOf("--jsdom", process.env.JSDOM_PATH ?? "jsdom");

let JSDOM;
let VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require(JSDOM_PATH));
} catch {
  console.error(
    `\n找不到 jsdom（嘗試載入 ${JSDOM_PATH}）。\n` +
    "這是選用測試，需要先安裝：\n" +
    "  npm install jsdom\n" +
    "  node app/test/audit-dom.mjs --jsdom ./node_modules/jsdom\n",
  );
  process.exit(2);
}

const errors = [];
let pass = 0;
let fail = 0;
const failures = [];

function check(ok, name, detail = "") {
  if (ok) { pass += 1; console.log(`  PASS  ${name}${detail ? "  ← " + detail : ""}`); }
  else { fail += 1; failures.push(name + (detail ? ` (${detail})` : "")); console.log(`  FAIL  ${name}${detail ? "  ← " + detail : ""}`); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, label, timeout = 15000) {
  const t0 = Date.now();
  let lastErr = null;
  while (Date.now() - t0 < timeout) {
    try { const v = fn(); if (v) return v; } catch (e) { lastErr = e; }
    await sleep(40);
  }
  throw new Error(`等待逾時：${label}${lastErr ? " / " + lastErr.message : ""}`);
}

(async () => {
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(`jsdomError: ${e.message}`));
  vc.on("error", (...a) => errors.push(`console.error: ${a.join(" ")}`));

  const html = await (await fetch(BASE + "/")).text();
  const cleaned = html.replace(/<script[^>]*type="module"[^>]*><\/script>/gi, "");
  const dom = new JSDOM(cleaned, { url: BASE + "/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  window.fetch = async (input, init) => fetch(typeof input === "string" ? new URL(input, BASE).href : input, init);
  window.addEventListener("error", (e) => errors.push(`window.onerror: ${e.message}`));
  window.addEventListener("unhandledrejection", (e) => errors.push(`unhandledrejection: ${e.reason}`));

  const mdSrc = (await (await fetch(BASE + "/md.js")).text())
    .replace(/^export function /gm, "function ")
    .replace(/^export \{ escapeHtml \};?$/gm, "window.escapeHtml = escapeHtml; window.renderMarkdown = renderMarkdown;");
  const appSrc = (await (await fetch(BASE + "/app.js")).text()).replace(/^import .*$/gm, "");

  console.log("\n── A. 載入與啟動 ─────────────────────────────");
  window.eval(mdSrc);
  window.eval(appSrc);
  const doc = window.document;
  const $ = (id) => doc.getElementById(id);
  const qsa = (sel) => [...doc.querySelectorAll(sel)];

  await waitFor(() => qsa("#sidebar .nodeItem").length > 0, "側邊欄載入");
  const course = await (await fetch(BASE + "/api/course")).json();
  const allNodes = course.levels.flatMap((l) => l.nodes);

  check(qsa("#sidebar .nodeItem").length === 40, "側邊欄 40 個節點", `${qsa("#sidebar .nodeItem").length}`);
  check(qsa("#sidebar .levelGroup").length === 7, "側邊欄 7 個等級", `${qsa("#sidebar .levelGroup").length}`);
  const passedNow = allNodes.filter((n) => n.passed).length;
  check($("progressText").textContent.trim() === `${passedNow} / ${allNodes.length}`,
    `進度顯示 ${passedNow} / ${allNodes.length}`, $("progressText").textContent);
  check($("statChip").textContent.length > 0, "獨立完成率晶片有內容", $("statChip").textContent);

  // 沒有解鎖機制：所有節點按鈕都必須是可點的
  const disabledCount = qsa("#sidebar .nodeItem").filter((b) => b.disabled).length;
  check(disabledCount === 0, "沒有任何節點被鎖住（按鈕都不是 disabled）", `${disabledCount} 個 disabled`);

  // 環境晶片是 async 的，給它時間（doctor 會探測工具鏈）
  let envOk = false;
  try {
    await waitFor(() => !$("envChip").textContent.includes("檢查中"), "環境晶片更新", 20000);
    envOk = true;
  } catch { envOk = false; }
  check(envOk, "環境晶片會更新（非一直「檢查中」）", $("envChip").textContent);

  console.log("\n── B. 自由存取：先直接開最後一節 ─────────────");
  const nodeEls = qsa("#sidebar .nodeItem");
  const openNode = async (i) => {
    const node = allNodes[i];
    nodeEls[i].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await waitFor(() => {
      const h1 = $("lesson").querySelector("h1");
      return h1 && h1.textContent.trim() === node.title;
    }, `${node.id} 課文`, 12000);
  };

  // 不經過任何前面的節點，直接跳最後一節（舊版這裡會是 disabled / 403）
  const lastIdx = allNodes.length - 1;
  await openNode(lastIdx);
  check($("btnRun").disabled === false, `可以直接開最後一節（${allNodes[lastIdx].id}）並執行`,
    `btnRun.disabled=${$("btnRun").disabled}`);
  check($("lesson").querySelector(".taskCard") !== null, "最後一節的任務卡正常渲染");

  // 草稿：在編輯器打字 → debounce 後應該存到伺服器
  const ta = $("editor").querySelector("textarea");
  if (ta) {
    const marker = `// draft-probe-${Date.now()}`;
    ta.value = `${marker}\n${ta.value}`;
    ta.dispatchEvent(new window.Event("input", { bubbles: true }));
    await sleep(1800); // 等 debounce（1.2s）+ 往返
    const saved = await (await fetch(`${BASE}/api/nodes/${allNodes[lastIdx].id}`)).json();
    check(typeof saved.draft === "string" && saved.draft.includes("draft-probe-"),
      "編輯器內容會自動存到伺服器（重新整理不會丟）",
      saved.draft ? `${saved.draft.length} 字` : "沒有草稿");
  } else {
    check(false, "編輯器有可輸入的 textarea");
  }

  console.log("\n── C. 逐一開啟全部 40 節（等標題切換完成）───");
  const navFail = [];

  for (let i = 0; i < allNodes.length; i += 1) {
    const node = allNodes[i];
    try {
      await openNode(i);
      const detail = await (await fetch(`${BASE}/api/nodes/${node.id}`)).json();
      const lesson = $("lesson");
      const drills = lesson.querySelectorAll(".drill").length;
      const expectDrills = (detail.drills ?? []).length;
      const optCount = lesson.querySelectorAll(".optBtn").length;
      const expectOpt = (detail.drills ?? []).reduce((a, d) => a + (d.choices?.length ?? 0), 0);
      const hintBtn = lesson.querySelector("#btnHint");
      const stepItems = lesson.querySelectorAll(".taskSteps li").length;
      const problems = [];
      if (!lesson.querySelector(".taskCard")) problems.push("無任務卡");
      if (drills !== expectDrills) problems.push(`練習 ${drills}/${expectDrills}`);
      if (optCount !== expectOpt) problems.push(`選項 ${optCount}/${expectOpt}`);
      if (stepItems < 2) problems.push(`步驟 ${stepItems}`);
      if (!hintBtn) problems.push("無提示按鈕");
      if (!lesson.querySelector(".objectives")) problems.push("無學習目標");
      const fname = $("fileName").textContent;
      if (!fname.startsWith(detail.submissionName ?? "submission.cpp")) problems.push(`檔名 ${fname}`);
      const ed = $("editor");
      if (!ed.textContent.trim() && !ed.querySelector("textarea")) problems.push("編輯器空白");
      if (problems.length) navFail.push(`${node.id}: ${problems.join(",")}`);
    } catch (e) {
      navFail.push(`${node.id} ${e.message}`);
    }
  }
  check(navFail.length === 0, "40 節內容與渲染全部齊全", navFail.slice(0, 4).join(" | "));

  console.log("\n── D. 單節互動（L0.01）──────────────────────");
  await openNode(0);
  const hintBtn = $("btnHint");
  const hintTotal = (await (await fetch(`${BASE}/api/nodes/${allNodes[0].id}`)).json()).hints.length;
  let shownOk = true;
  for (let k = 1; k <= hintTotal; k += 1) {
    hintBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await sleep(80);
    const got = $("hintList").children.length;
    if (got !== k) { shownOk = false; break; }
  }
  check(shownOk, "提示逐條揭露且計數正確", `${hintTotal} 條`);
  check(hintBtn.disabled === true, "提示全部顯示後按鈕停用");
  check(/提示已全部顯示/.test(hintBtn.textContent), "按鈕文字變成「已全部顯示」", hintBtn.textContent);

  let solved = false;
  for (const o of [...$("lesson").querySelector(".drill").querySelectorAll(".optBtn")]) {
    o.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await sleep(40);
    if ($("lesson").querySelector(".drill .feedback.ok")) { solved = true; break; }
  }
  check(solved, "點對選項顯示「正確」");
  check($("lesson").querySelector(".drill .explain") !== null, "答對後顯示解說");
  if (solved) {
    const marked = [...$("lesson").querySelectorAll(".drill .optBtn")].filter((b) => b.classList.contains("ok")).length;
    check(marked === 1, "只有一個選項被標記正確", `${marked}`);
  }

  $("btnReset").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(150);
  check($("editor").textContent.length > 0 || $("editor").querySelector("textarea") !== null, "「還原」後編輯器仍有內容");

  console.log("\n── E. 真正執行一次評測 ───────────────────────");
  const t0 = Date.now();
  $("btnRun").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await waitFor(() => $("results").textContent.trim().length > 30 && !$("runState").textContent.includes("執行中"), "評測完成", 180000);
  const resultsEls = $("results").querySelectorAll("*").length;
  check(resultsEls > 3, "評測結果已渲染", `${resultsEls} 個節點，${Math.round((Date.now() - t0) / 1000)}s`);
  check(/FAIL|PASS|失敗|通過/.test($("results").textContent), "評測結果有判定字樣", $("results").textContent.slice(0, 30).replace(/\s+/g, " "));

  console.log("\n── F. 錯誤圖鑑 ───────────────────────────────");
  $("btnAtlas").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await waitFor(() => !$("modal").classList.contains("hidden"), "圖鑑開啟");
  await waitFor(() => qsa("#modalBody .atlasEntry, #modalBody article, #modalBody details, #modalBody .entry").length > 0 || $("modalBody").textContent.includes("條"), "圖鑑列表", 15000);
  check($("modalTitle").textContent.includes("圖鑑"), "圖鑑可開啟", $("modalTitle").textContent);
  const totalBefore = qsa("#modalBody [data-entry], #modalBody .atlasEntry, #modalBody details").length;
  const search = $("atlasSearch");
  check(search !== null, "圖鑑有搜尋框");
  if (search) {
    search.value = "undefined reference";
    search.dispatchEvent(new window.Event("input", { bubbles: true }));
    await sleep(300);
    const after = qsa("#modalBody [data-entry], #modalBody .atlasEntry, #modalBody details").length;
    const text = $("modalBody").textContent;
    check(after > 0 && (after <= totalBefore || totalBefore === 0), "圖鑑搜尋會過濾並保留結果",
      `${totalBefore} → ${after}；${text.slice(0, 30).replace(/\s+/g, " ")}`);
    search.value = "zzz_no_such_error_zzz";
    search.dispatchEvent(new window.Event("input", { bubbles: true }));
    await sleep(300);
    check($("modalBody").textContent.length < text.length + 50, "搜不到時不會爆掉",
      $("modalBody").textContent.slice(0, 30).replace(/\s+/g, " "));
    search.value = "";
    search.dispatchEvent(new window.Event("input", { bubbles: true }));
    await sleep(200);
  }
  const chips = qsa("#modalBody .linkChip[data-node]");
  check(chips.length > 0, "圖鑑可連到節點", `${chips.length} 個 chip`);
  if (chips.length) {
    chips[0].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await sleep(700);
    check($("modal").classList.contains("hidden"), "點圖鑑節點連結會關閉圖鑑並跳轉");
  }
  if (!$("modal").classList.contains("hidden")) {
    $("modalClose").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await sleep(100);
  }
  check($("modal").classList.contains("hidden"), "圖鑑可關閉");

  console.log("\n── G. 環境檢查 ───────────────────────────────");
  $("btnDoctor").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await waitFor(() => !$("modal").classList.contains("hidden"), "環境檢查開啟");
  await sleep(600);
  check($("modalTitle").textContent.includes("環境"), "環境檢查可開啟", $("modalTitle").textContent);
  check($("modalBody").textContent.length > 20, "環境檢查有內容", `${$("modalBody").textContent.length} 字`);
  $("modalClose").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(100);

  console.log("\n── H. 複習（開在 modal 裡）───────────────────");
  const chip = $("reviewChip");
  check(chip !== null, "有複習晶片");
  check(chip && !chip.hidden, "複習晶片可見（有到期卡）", chip ? chip.textContent : "-");
  if (chip && !chip.hidden) {
    chip.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await waitFor(() => !$("modal").classList.contains("hidden") && $("modalTitle").textContent.includes("複習"), "複習開啟", 12000);
    await waitFor(() => $("modalBody").textContent.length > 10, "複習內容", 12000);
    check($("modalTitle").textContent === "複習", "複習開啟在 modal", $("modalTitle").textContent);

    // 翻面 → 四個評分按鈕 → 評分要真的送出去並換下一張
    const revealBtn = qsa("#modalBody button").find((b) => /顯示答案|看答案|翻面/.test(b.textContent));
    check(Boolean(revealBtn), "複習卡有「顯示答案」按鈕");
    if (revealBtn) {
      revealBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      await sleep(200);
      const gradeBtns = qsa("#modalBody .gradeBtn");
      check(gradeBtns.length === 4, "翻面後出現 4 個評分按鈕", `${gradeBtns.length}`);
      const beforeText = $("modalBody").textContent;
      if (gradeBtns.length === 4) {
        gradeBtns[2].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
        await sleep(600);
        const afterText = $("modalBody").textContent;
        check(afterText !== beforeText, "評分後畫面有變化（換卡或無到期）",
          afterText.slice(0, 30).replace(/\s+/g, " "));
        const statsAfter = await (await fetch(`${BASE}/api/review/stats`)).json();
        check(typeof statsAfter.total === "number" && typeof statsAfter.due === "number",
          "評分後複習統計可讀", `dueNow=${statsAfter.dueNow}`);
      }
    }

    check($("btnReviewStats") !== null, "複習有統計按鈕");
    if ($("btnReviewStats")) {
      $("btnReviewStats").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      await waitFor(() => $("modalTitle").textContent.includes("統計"), "統計開啟", 12000);
      await sleep(400);
      check($("modalBody").textContent.length > 30, "複習統計有內容", `${$("modalBody").textContent.length} 字`);
      check($("btnReviewBack") !== null, "統計頁有「回複習」按鈕");
      if ($("btnReviewBack")) {
        $("btnReviewBack").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
        await sleep(400);
        check($("modalTitle").textContent === "複習", "「回複習」會回到複習", $("modalTitle").textContent);
      }
    }
    $("modalClose").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await sleep(100);
    check($("modal").classList.contains("hidden"), "複習可關閉");
  }

  console.log("\n── I. 未捕捉的 JS 例外 ───────────────────────");
  const real = errors.filter((e) => !/monaco|vendor\/|Failed to load resource|404|Not implemented/i.test(e));
  check(real.length === 0, "全程沒有未捕捉例外", real.slice(0, 3).join(" | "));

  console.log(`\n結果：${pass} 通過 / ${fail} 失敗`);
  if (fail) { console.log("\n失敗項目："); failures.forEach((f) => console.log("  -", f)); }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("\n腳本錯誤：", e); process.exit(2); });
