// CppForge 產品：課程內容載入
//
// 內容是純資料（git 可版控、可 review），格式與 POC 的 fixture 一致：
//
//   content/L1/01-variables/
//     node.json          題目定義（中繼資料、grader 設定、練習卡）
//     lesson.md          課文（Markdown）
//     starter.cpp        學員起始碼（可編譯，但測試會失敗）
//     tests.cpp          隱藏測試（學員看不到）
//     interface/*.hpp    不可修改的介面（可選）
//     .meta/solution.cpp 參考解（CI 用）
//
// 這裡只負責「讀 + 驗證 + 組裝」，不負責評分（見 grading.mjs）。

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { CONTENT_DIR } from "./config.mjs";
import { ENTRIES } from "./data/atlas.mjs";

const LEVEL_TITLES = {
  0: "L0 · 環境與心智模型",
  1: "L1 · 語言基礎",
  2: "L2 · 物件與資源",
  3: "L3 · 泛型與標準庫",
  4: "L4 · 工程化與正確性",
  5: "L5 · 效能與併發",
  6: "L6 · 職場整合",
};

const exists = (p) => stat(p).then(() => true, () => false);

async function readIf(p, fallback = null) {
  return (await exists(p)) ? readFile(p, "utf8") : fallback;
}

/** 掃描 content/ 下所有 node.json，回傳已排序的節點清單 */
export async function scanNodes() {
  const nodes = [];
  const levelDirs = (await readdir(CONTENT_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && /^L\d/.test(d.name))
    .map((d) => d.name)
    .sort();

  for (const levelDir of levelDirs) {
    const base = path.join(CONTENT_DIR, levelDir);
    const nodeDirs = (await readdir(base, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const nodeDir of nodeDirs) {
      const dir = path.join(base, nodeDir);
      const metaPath = path.join(dir, "node.json");
      if (!(await exists(metaPath))) continue;
      const meta = JSON.parse(await readFile(metaPath, "utf8"));
      nodes.push({ ...meta, dir, slug: `${levelDir}/${nodeDir}` });
    }
  }
  return nodes.sort((a, b) =>
    a.level !== b.level ? a.level - b.level : (a.order ?? 0) - (b.order ?? 0));
}

/**
 * 課程樹。
 *
 * 所有節點**一律可存取**（unlocked 永遠 true）—— 這是有意的設計決定：
 * 學習者可以自由跳到任何一節，不必先通過前面。`prerequisites` 仍然保留，
 * 但只用來顯示「建議先看過」的提示（`suggestsFirst`），不再是門檻。
 */
export async function courseTree(progress) {
  const nodes = await scanNodes();
  const passed = new Set([...progress.values()].filter((p) => p.passed).map((p) => p.node_id));

  const enriched = nodes.map((n) => {
    const prereqs = n.prerequisites ?? [];
    const row = progress.get(n.id);
    return {
      id: n.id,
      title: n.title,
      level: n.level,
      order: n.order ?? 0,
      minutes: n.minutes ?? 20,
      slug: n.slug,
      prerequisites: prereqs,
      concepts: n.concepts ?? [],
      tags: n.tags ?? [],
      unlocked: true,            // 不再上鎖
      passed: passed.has(n.id),
      attempts: row?.attempts ?? 0,
      // 只作為 UI 提示：「先看過這幾節會更順」，不影響能不能開
      suggestsFirst: prereqs.filter((p) => !passed.has(p)),
    };
  });

  const levels = [];
  for (const n of enriched) {
    let lv = levels.find((l) => l.level === n.level);
    if (!lv) {
      lv = { level: n.level, title: LEVEL_TITLES[n.level] ?? `L${n.level}`, nodes: [] };
      levels.push(lv);
    }
    lv.nodes.push(n);
  }
  return levels;
}

/**
 * 沒有手寫 steps 時，依「這一節會跑哪些 grader」自動產生一份可執行的流程。
 *
 * 為什麼放在伺服器而不是前端：API 是契約。若「怎麼做」只在客戶端生成，
 * 第二個客戶端（或直接用 API 的人）就拿不到指引 —— 這是審計時發現的缺口。
 */
export function defaultSteps(node) {
  const g = node.graderSummary?.graders ?? node.graders ?? ["compile", "unit_test"];
  const steps = [];
  if ((node.interfaceFiles ?? []).length) {
    steps.push("先讀下面的 interface 檔：型別、參數、回傳值就是規格，不能改。");
  }
  if (g.includes("compile")) steps.push("改右側程式碼，先讓「編譯」這一列變成 PASS（訊息的行號就是位置）。");
  if (g.includes("unit_test")) steps.push("看評測裡失敗的 test 名稱 —— 那就是規格，一次修一個。");
  if (g.includes("io_match")) steps.push("用題目給的測資自己比對輸出：空白、換行、大小寫都算。");
  if (g.includes("runtime_safety")) steps.push("test 全過之後再看「memory safety」：洩漏或越界會單獨讓它 FAIL。");
  if (g.includes("static_rules")) steps.push("注意「static 規則」：有些寫法被禁止，也有些是**必須**使用的。");
  if (g.includes("analyzer")) steps.push("看「static analysis」指出的行號 —— 那是分析器認為可疑的地方。");
  if (!steps.length) steps.push("修改右側程式碼，讓評測全部通過。");
  return steps;
}

/** 單一節點的完整內容（給 UI）。opts.draft = 伺服器端儲存的草稿（可選） */
export async function loadNode(id, progress, opts = {}) {
  const { draft = null } = opts;
  const nodes = await scanNodes();
  const node = nodes.find((n) => n.id === id);
  if (!node) return null;

  const dir = node.dir;
  const subName = node.submissionName ?? "starter.cpp";
  const lesson = (await readIf(path.join(dir, "lesson.md"))) ?? "（這一節還沒有課文）";
  const starter = (await readIf(path.join(dir, subName))) ?? "";

  // 介面檔（不可修改，UI 以唯讀分頁顯示）
  const interfaceFiles = [];
  const ifaceDir = path.join(dir, "interface");
  if (await exists(ifaceDir)) {
    for (const f of await readdir(ifaceDir)) {
      interfaceFiles.push({ name: f, content: await readFile(path.join(ifaceDir, f), "utf8") });
    }
  }

  const row = progress.get(id);
  const prereqs = node.prerequisites ?? [];
  const passed = new Set([...progress.values()].filter((p) => p.passed).map((p) => p.node_id));

  return {
    id: node.id,
    title: node.title,
    level: node.level,
    minutes: node.minutes ?? 20,
    objectives: node.objectives ?? [],
    concepts: node.concepts ?? [],
    submissionName: subName,
    prerequisites: prereqs,
    unlocked: true,                                  // 自由存取，不再依先修解鎖
    suggestsFirst: prereqs.filter((p) => !passed.has(p)),
    passed: passed.has(id),
    attempts: row?.attempts ?? 0,
    lesson,
    starter,
    // 伺服器端草稿（由呼叫端傳入；content.mjs 刻意不依賴 db）
    draft: draft ?? null,
    interfaceFiles,
    drills: node.drills ?? [],
    // 任務卡用：怎麼做（步驟）與提示。
    // steps 沒手寫時由伺服器依 grader 產生 —— API 一定給得出完整指引。
    steps: (node.steps ?? []).length ? node.steps : defaultSteps(node),
    hints: node.hints ?? [],
    graderSummary: {
      graders: node.graders ?? ["compile", "unit_test"],
      minTests: node.minTests ?? node.grader?.assertions?.minTests ?? 1,
      hasStaticRules: (node.grader?.staticRules ?? node.staticRules ?? []).length > 0,
      ioCases: (node.io?.cases ?? []).length,
    },
  };
}

/** 內容健康檢查（等於 POC 的內容 CI 的靜態部分） */
export async function lintContent() {
  const nodes = await scanNodes();
  const problems = [];
  const ids = new Set(nodes.map((n) => n.id));

  for (const n of nodes) {
    const where = n.slug;
    if (!n.id) problems.push(`${where}: 缺少 id`);
    if (!n.title) problems.push(`${where}: 缺少 title`);
    if (typeof n.level !== "number") problems.push(`${where}: 缺少 level`);
    for (const p of n.prerequisites ?? []) {
      if (!ids.has(p)) problems.push(`${where}: 先修節點 ${p} 不存在`);
      if (p === n.id) problems.push(`${where}: 先修節點不能是自己`);
    }
    // 提交檔名預設 starter.cpp；模板類的節點用 .hpp（定義必須在標頭檔）
    const starterName = n.submissionName ?? "starter.cpp";
    const solutionName = n.submissionName ?? "solution.cpp";
    if (!(await exists(path.join(n.dir, starterName)))) problems.push(`${where}: 缺少 ${starterName}`);
    if (!(await exists(path.join(n.dir, "lesson.md")))) problems.push(`${where}: 缺少 lesson.md`);

    // 任務指示必須「找得到」：介面檔（契約）或課文裡的任務段落，至少一個。
    // UI 的「本節任務」卡與「跳到題目」都靠這個規則；沒有它就會出現
    // 「點進某一節卻看不出要寫什麼」的死角。
    const lessonText = await readFile(path.join(n.dir, "lesson.md"), "utf8").catch(() => "");
    const taskHeading = lessonText.split(/\r?\n/)
      .map((line) => /^(#{2,3})\s+(.+)$/.exec(line))
      .filter(Boolean)
      .map((m) => m[2].trim())
      .find((text) => /^(你要實作|你要做的事|實作[:：])/.test(text));
    if (!taskHeading) {
      problems.push(`${where}: 課文缺少任務段落（建議「## 你要實作的部分」）——「跳到題目」會沒有目標`);
    }

    // 每節都必須有提示：卡住時「看提示」是學員唯一的自救管道
    const hints = n.hints ?? [];
    if (hints.length < 2) {
      problems.push(`${where}: 提示少於 2 條（hints）—— 卡住的人沒有後路`);
    }
    for (const [i, h] of hints.entries()) {
      if (String(h).trim().length < 12) problems.push(`${where}: hints[${i}] 太短（少於 12 字），寫具體一點`);
    }
    if ((n.steps ?? []).length === 1) {
      problems.push(`${where}: steps 只有 1 步，要嘛寫完整、要嘛留空讓系統自動產生`);
    }
    // 每節至少 2 張複習卡：審計時發現有 6 節 0 張卡，等於那些主題沒有間隔複習
    if ((n.cards ?? []).length < 2) {
      problems.push(`${where}: 複習卡少於 2 張（cards）—— 這一節不會進到複習排程`);
    }
    for (const [i, c] of (n.cards ?? []).entries()) {
      if (!c?.q || !c?.a) problems.push(`${where}: cards[${i}] 缺少 q 或 a`);
    }
    const graders = n.graders ?? ["compile", "unit_test"];
    if (graders.includes("unit_test") && !(await exists(path.join(n.dir, "tests.cpp")))) {
      problems.push(`${where}: 宣告了 unit_test 但缺少 tests.cpp`);
    }
    if (graders.includes("io_match") && !(n.io?.cases ?? []).length) {
      problems.push(`${where}: 宣告了 io_match 但沒有 io.cases`);
    }
    // 每組測資都必須有「期望輸出」，否則評測會永遠失敗（而且訊息看不出原因）
    for (const [i, cs] of (n.io?.cases ?? []).entries()) {
      const want = cs.expect ?? cs.stdout ?? "";
      if (String(want).length === 0) {
        problems.push(`${where}: io.cases[${i}] 缺少 expect/stdout（期望輸出不能是空的）`);
      }
    }
    if (graders.includes("io_match") && starterName.endsWith(".hpp")) {
      problems.push(`${where}: 標頭檔提交不可能有 main，不能宣告 io_match`);
    }
    if (!(await exists(path.join(n.dir, ".meta", solutionName)))) {
      problems.push(`${where}: 缺少 .meta/${solutionName}（無法驗證題目正確性）`);
    }
    // 複習卡：有宣告就必須有問題與答案，否則複習系統會顯示空白卡
    for (const [i, c] of (n.cards ?? []).entries()) {
      if (!c.q || !c.a) problems.push(`${where}: cards[${i}] 缺少 q 或 a`);
    }

    // 即時練習卡：一律選擇題（開放式打字不適合這種節奏，也難以客觀批改）
    const norm = (s) => String(s ?? "").trim().toLowerCase();
    for (const [i, d] of (n.drills ?? []).entries()) {
      const at = `${where}: drills[${i}]`;
      if (!d.prompt) problems.push(`${at} 缺少 prompt`);
      if (d.kind === "text") {
        problems.push(`${at} 是開放式打字題；請改成 kind: "choice" 並提供選項`);
        continue;
      }
      const choices = d.choices ?? [];
      if (choices.length < 3) problems.push(`${at} 選項少於 3 個`);
      if (choices.length > 6) problems.push(`${at} 選項超過 6 個（太長不好讀）`);
      if (!choices.map(norm).includes(norm(d.answer))) {
        problems.push(`${at} 的 answer 不在 choices 裡（這題永遠答不對）`);
      }
      if (new Set(choices.map(norm)).size !== choices.length) {
        problems.push(`${at} 有重複選項（會出現兩個正解）`);
      }
      // <option> 只能是純文字，選項裡的 Markdown 會原樣顯示成符號
      for (const c of choices) {
        if (/`|\*\*/.test(c)) problems.push(`${at} 的選項含 Markdown 記號（不會被渲染）：${c}`);
      }
    }
  }

  // 圖鑑的 concepts 標籤必須真的存在於某個節點，否則「相關課程」永遠是空的
  const allConcepts = new Set(nodes.flatMap((n) => n.concepts ?? []));
  for (const e of ENTRIES) {
    for (const c of e.concepts ?? []) {
      if (!allConcepts.has(c)) {
        problems.push(`圖鑑 ${e.id}: concept "${c}" 沒有任何節點宣告（相關課程會是空的）`);
      }
    }
  }

  // 環偵測（先修關係必須是 DAG）
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const state = new Map(); // 0=未訪, 1=訪問中, 2=完成
  const visit = (id, trail) => {
    const s = state.get(id) ?? 0;
    if (s === 2) return;
    if (s === 1) {
      problems.push(`先修關係有環：${[...trail, id].join(" → ")}`);
      return;
    }
    state.set(id, 1);
    for (const p of byId.get(id)?.prerequisites ?? []) visit(p, [...trail, id]);
    state.set(id, 2);
  };
  for (const n of nodes) visit(n.id, []);

  return { nodeCount: nodes.length, problems };
}
