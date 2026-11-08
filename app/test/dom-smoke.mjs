#!/usr/bin/env node
// CppForge：前端冒煙測試（不開瀏覽器，真的執行 app.js）
//
// 為什麼需要它：
//   本機無法啟動無頭瀏覽器（Chromium 需要具名管道，而開發沙箱封鎖了它），
//   所以改用最小的 DOM shim 把真正的 app.js 跑起來。
//   它不能驗證「長得好不好看」，但能抓到真正的執行期錯誤：
//   取不到元素、undefined 屬性、渲染函式丟例外、流程順序錯。
//
// 用法：node app/test/dom-smoke.mjs [--run]
//   --run  額外模擬按下「執行」，走完一次評測（會呼叫真實 API）

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BASE = process.env.CPPFORGE_BASE || "http://127.0.0.1:4173";
const APP = path.resolve(import.meta.dirname, "..");
const withRun = process.argv.includes("--run");

// ── 把失敗當失敗，不要靜默通過 ─────────────────────────────────────
const failures = [];
const check = (ok, label, extra = "") => {
  if (ok) console.log(`  PASS  ${label}`);
  else { console.log(`  FAIL  ${label}${extra ? "  ← " + extra : ""}`); failures.push(label); }
};

// ── 最小 DOM ────────────────────────────────────────────────────────
class ClassList {
  constructor(owner = null) { this.owner = owner; this.set = new Set(); }
  _sync() { if (this.owner) this.owner.className = [...this.set].join(" "); }
  add(...c) { c.forEach((x) => this.set.add(x)); this._sync(); }
  remove(...c) { c.forEach((x) => this.set.delete(x)); this._sync(); }
  contains(c) { return this.set.has(c); }
  toString() { return [...this.set].join(" "); }
}

// 極簡 HTML 解析器：只支援這個專案用到的子集（巢狀標籤、屬性、自閉合、void 元素、文字）。
// 目的不是「正確的 HTML5」，而是讓 innerHTML 產生的節點能被 querySelectorAll 找到。
const VOID_TAGS = new Set(["br", "img", "input", "hr", "meta", "link", "source", "area", "col"]);

function parseHtml(html) {
  const roots = [];
  const stack = [roots];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, closing, tag, attrStr, selfClose, text] = m;
    if (text !== undefined) {
      const t = text.trim();
      if (t) {
        const node = new Element("#text");
        node._text = t;
        stack[stack.length - 1].push(node);
      }
      continue;
    }
    if (closing) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const node = new Element(tag);
    node.dataset = {};
    for (const am of (attrStr ?? "").matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) {
      const name = am[1];
      const value = am[2] ?? "";
      if (name === "class") node.className = value;
      else if (name === "value") node.value = value;
      else if (name === "id") node.id = value;
      else if (name.startsWith("data-")) {
        node.dataset[name.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] = value;
      }
    }
    stack[stack.length - 1].push(node);
    // void 元素與自閉合標籤不進堆疊，否則後面的內容會全部被塞進去
    if (!selfClose && !VOID_TAGS.has(String(tag).toLowerCase())) stack.push(node.children);
  }
  return roots;
}

// 真實瀏覽器的 querySelectorAll 回傳 NodeList：有 length / item / forEach / 迭代器，
// **但沒有 find / map / filter**。shim 若回傳陣列，就會掩蓋「app.js 用了瀏覽器不存在的 API」
// 這類錯誤（例如 `querySelectorAll(...).find(...)` 在真實瀏覽器會丟 TypeError）。
class NodeList {
  constructor(items) {
    this._items = items;
    this.length = items.length;
  }
  item(i) { return this._items[i] ?? null; }
  forEach(fn, thisArg) { this._items.forEach(fn, thisArg); }
  *[Symbol.iterator]() { yield* this._items; }
}

class Element {
  constructor(tag = "div", id = null) {
    this.tagName = String(tag).toUpperCase();
    this.id = id;
    this.children = [];
    this._html = "";
    this._text = "";
    this._className = "";
    // classList 與 className 必須同步（真實瀏覽器也是同一個狀態的兩種視圖）
    this.classList = new ClassList(this);
    this.style = {};
    this._handlers = new Map();
    this.value = "";
    this.disabled = false;
    this.title = "";
    this.type = "";
    this.placeholder = "";
    this.scrollTop = 0;
    this.spellcheck = true;
    this.selectionStart = 0;
    this.selectionEnd = 0;
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) {    this._html = String(v ?? "");
    // 簡化：設定 innerHTML 就清掉既有子節點（與瀏覽器行為一致）
    this.children = [];
    // 真實瀏覽器會「重新建立」innerHTML 裡的元素，getElementById 因此拿到新物件。
    // 若沿用舊物件，每次重繪都會往同一個元素累加事件監聽器，造成無限迴圈。
    //
    // 真實瀏覽器會把 innerHTML 解析成節點樹，`getElementById` 拿到的就是**樹裡那個節點**。
    // 所以這裡：先解析，再把解析出來的 id 節點登記起來（不是另外造一個物件）。
    // 若另造物件，app.js 之後對它 appendChild 的東西不會出現在教學區裡 —— 這正是
    // 「提示按鈕點了卻看不到提示」那類 bug 的來源。
    this.children = parseHtml(this._html);
    const register = (node) => {
      if (node.id) {
        knownIds.add(node.id);
        elementRegistry.set(node.id, node);
      }
      for (const c of node.children) register(c);
    };
    for (const c of this.children) register(c);
  }
  get textContent() {
    // 真實瀏覽器會遞迴串起子節點的文字；解析出來的節點沒有 _text，所以要往下找
    if (this.children.length) return this.children.map((c) => c.textContent ?? "").join("");
    return this._text;
  }
  set textContent(v) {
    // 真實 DOM：設定 textContent 會**清掉所有子節點**，換成一個文字節點
    this._text = String(v ?? "");
    this.children = [];
  }
  get className() { return this._className; }
  set className(v) {
    this._className = String(v ?? "");
    if (this.classList) {
      this.classList.set = new Set(this._className.split(/\s+/).filter(Boolean));
    }
  }
  appendChild(node) { this.children.push(node); return node; }
  append(...nodes) { nodes.forEach((n) => this.appendChild(n)); return this; }
  addEventListener(type, fn) {
    if (!this._handlers.has(type)) this._handlers.set(type, []);
    this._handlers.get(type).push(fn);
  }
  dispatch(type, evt = {}) {
    // 走訪快照：處理器可能在此期間重新註冊/移除自己
    for (const fn of [...(this._handlers.get(type) ?? [])]) {
      fn({ target: this, preventDefault() {}, ...evt });
    }
  }
  setRangeText() {}
  focus() {}
  /** 遞迴序列化成接近真實的 HTML（含 className），給斷言用 */
  deepHtml() {
    const tag = String(this.tagName).toLowerCase();
    const cls = this.className ? ` class="${this.className}"` : "";
    // children 是解析出來的節點時，用 children；否則用原始的 _text/_html
    const inner = this.children.length ? "" : (this._text || this._html);
    const kids = this.children.map((c) => (c.deepHtml ? c.deepHtml() : "")).join("");
    return `<${tag}${cls}>${inner}${kids}</${tag}>`;
  }
  find(fn) {
    if (fn(this)) return this;
    for (const c of this.children) {
      const hit = c.find?.(fn);
      if (hit) return hit;
    }
    return null;
  }
  // 極簡 selector：支援 tag、.class、[attr]、以及組合（例如 `.linkChip[data-node]`）。
  // 真實瀏覽器當然複雜得多，但這已足夠抓到「app.js 用了瀏覽器才有的 API」這一類錯。
  querySelectorAll(selector) {
    const parts = selector.trim().match(/^([a-zA-Z][a-zA-Z0-9]*)?((?:\.[\w-]+)*)((?:\[[\w-]+\])*)$/);
    if (!parts) throw new Error(`不支援的 selector: ${selector}`);
    const tag = parts[1] ? parts[1].toLowerCase() : null;
    const classes = (parts[2] ?? "").split(".").filter(Boolean);
    const attrs = [...(parts[3] ?? "").matchAll(/\[([\w-]+)\]/g)].map((m) => m[1]);

    const matches = (node) => {
      if (tag && String(node.tagName).toLowerCase() !== tag) return false;
      const cls = new Set(String(node.className ?? "").split(/\s+/).filter(Boolean));
      for (const c of classes) if (!cls.has(c)) return false;
      for (const a of attrs) {
        const key = a.replace(/^data-/, "").replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
        if (a in node || key in node || node.dataset?.[key] !== undefined) continue;
        return false;
      }
      return true;
    };

    const out = [];
    const walk = (node) => {
      for (const c of node.children) {
        if (matches(c)) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return new NodeList(out);   // 不是陣列：沒有 find/map，才測得出瀏覽器相容性
  }
}

// index.html 靜態定義的 id + innerHTML 動態產生的 id
const knownIds = new Set(
  [...(await readFile(path.join(APP, "web", "index.html"), "utf8"))
    .matchAll(/id="([^"]+)"/g)].map((m) => m[1]),
);
const elementRegistry = new Map();
const ids = knownIds;

const document = {
  getElementById: (id) => {
    if (!knownIds.has(id)) return null;       // 真的不存在就回 null，才能抓到打錯 id
    if (!elementRegistry.has(id)) elementRegistry.set(id, new Element("div", id));
    return elementRegistry.get(id);
  },
  createElement: (tag) => new Element(tag),
  addEventListener: () => {},
  body: new Element("body"),
};

const storage = new Map();
const localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
};

const realFetch = globalThis.fetch;
const fetchShim = (url, opts) =>
  realFetch(url.startsWith("http") ? url : BASE + url, opts);

Object.assign(globalThis, {
  window: globalThis,
  document,
  localStorage,
  fetch: fetchShim,
  addEventListener: () => {},
  Event: class { constructor(t) { this.type = t; } },
});

// app.js 裡有 fire-and-forget 的非同步工作（例如 initEditor），
// 它們的例外會變成 unhandledRejection。收集起來，最後一起判失敗，
// 而不是讓行程直接崩掉、看不到完整報告。
const asyncErrors = [];
process.on("unhandledRejection", (err) => asyncErrors.push(err));
// app.js 用 window.require 判斷 Monaco 是否可用；不存在 → 走 textarea 退回
delete globalThis.require;

// ── 載入真正的 app.js ───────────────────────────────────────────────
console.log(`CppForge UI 冒煙測試  base=${BASE}\n`);
let loadError = null;
try {
  await import(pathToFileURL(path.join(APP, "web", "app.js")).href);
} catch (err) {
  loadError = err;
}
check(!loadError, "app.js 可載入並執行", loadError?.message);

// boot() 是 fire-and-forget，等它把非同步工作做完
const waitFor = async (fn, timeoutMs = 15000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 120));
  }
  return false;
};

const sidebar = document.getElementById("sidebar");
const lesson = document.getElementById("lesson");

const booted = await waitFor(() => sidebar.children.length > 0 && lesson.innerHTML.includes("<h1>"));
check(booted, "啟動後側欄與課文都有內容");

if (booted) {
  const nodeCount = sidebar.children.reduce((n, g) => n + g.children.length, 0);
  check(nodeCount >= 10, `側欄節點數 ≥ 10（實際 ${nodeCount}）`);
  check(/progressText/.test("progressText") && document.getElementById("progressText").textContent.includes("/"),
    "進度文字已更新", document.getElementById("progressText").textContent);
  check(document.getElementById("editor").children.length > 0
     || document.getElementById("editor").innerHTML.includes("textarea"),
    "編輯器已建立（Monaco 不可用時退回 textarea）");
  check(/drill/.test(lesson.deepHtml()), "課文含即時練習卡");
  // 即時練習一律是選擇題：選項是可點的按鈕，不是下拉選單、也不是文字輸入
  const optButtons = [...lesson.querySelectorAll(".optBtn")];
  check(optButtons.length > 0, "練習卡是可點選的選項（不是打字題）", `${optButtons.length} 個選項`);
  check(lesson.querySelectorAll("select").length === 0, "練習卡沒有下拉選單");
  const textInputs = [...lesson.querySelectorAll("input")].filter((n) => n.type === "text");
  check(textInputs.length === 0, "練習卡沒有開放式文字輸入");
  if (optButtons.length > 0) {
    // 只操作「第一題」的選項：逐一點到出現「正確 ✓」
    const firstDrill = [...lesson.querySelectorAll(".drill")][0];
    const opts = firstDrill ? [...firstDrill.querySelectorAll(".optBtn")] : [];
    check(opts.length >= 3, "第一題有至少 3 個選項", `${opts.length}`);
    let solved = false;
    for (const b of opts) {
      b.dispatch("click");
      if (/正確 ✓/.test(firstDrill.deepHtml())) { solved = true; break; }
    }
    check(solved, "點對選項會顯示「正確 ✓」");
    check(/class="explain"/.test(firstDrill.deepHtml()), "答對後顯示解說");
    check(opts.filter((b) => b.classList.contains("ok")).length === 1, "只有一個選項被標成正確");
    check(opts.every((b) => b.disabled), "答對後所有選項不可再點");
  }
  check(lesson.innerHTML.includes("objectives"), "課文含學習目標區塊");

  // ── 題目可見性 ────────────────────────────────────────────────────
  check(lesson.innerHTML.includes("taskCard"), "課文有「本節任務」卡");
  // 任務卡一定有內容：有介面檔就渲染介面，沒有就給文字說明
  if (lesson.innerHTML.includes("iface")) {
    check(lesson.innerHTML.includes("roTag"), "介面檔已渲染進任務卡（含唯讀標記）");
  } else {
    check(lesson.innerHTML.includes("taskHint"), "沒有介面檔時任務卡仍有說明文字");
  }
  // 指引：怎麼做（步驟清單）
  const stepLists = [...lesson.querySelectorAll(".taskSteps")];
  check(stepLists.length > 0, "任務卡有「怎麼做」區塊");
  if (stepLists.length) {
    const n = stepLists[0].children.length;
    check(n >= 2, "「怎麼做」至少 2 步", `${n} 步`);
  }
  // 提示：一次揭露一條，按鈕計數會更新
  const hintBtn = document.getElementById("btnHint");
  check(Boolean(hintBtn), "任務卡有「看提示」按鈕");
  if (hintBtn) {
    const before = [...lesson.querySelectorAll(".hintItem")].length;
    check(/看提示（0\/\d+）/.test(hintBtn.textContent ?? ""), "提示按鈕顯示進度", hintBtn.textContent);
    hintBtn.dispatch("click");
    const after = [...lesson.querySelectorAll(".hintItem")].length;
    check(after === before + 1, "點一次顯示一條提示", `${before} → ${after}`);
    check(/看提示（1\/\d+）|提示已全部顯示/.test(hintBtn.textContent ?? ""),
      "提示按鈕的計數會更新", hintBtn.textContent);
  }
  const taskHeadings = [...lesson.querySelectorAll("h2"), ...lesson.querySelectorAll("h3")]    .filter((h) => h.id === "taskSection");
  const jumpBtn = document.getElementById("btnJumpTask");
  if (taskHeadings.length > 0) {
    check(Boolean(jumpBtn), "任務卡有「跳到題目」按鈕（這一節有題目段落）");
    if (jumpBtn) {
      jumpBtn.dispatch("click");   // 不該丟錯（shim 沒有 scrollIntoView，要走 fallback）
      check(true, "點「跳到題目」不會丟錯");
    }
  } else {
    // 這一節沒有「你要實作的部分」段落（例如 L0.01 只要改程式讓輸出正確）
    check(!jumpBtn, "沒有題目段落時不顯示跳轉按鈕（避免假 affordance）");
    check(lesson.innerHTML.includes("直接修改右側程式碼"),
      "沒有介面檔的節點有明確的任務說明");
  }
  check(lesson.querySelectorAll("code").length > 0 || lesson.innerHTML.includes("codeBlock"),
    "課文有程式碼區塊");

  // 介面檔（題目契約）的資料面：冷啟動時 L0 沒有介面檔，所以用 API 確認
  // 有介面的節點真的帶著內容 —— UI 端會把它渲染進「本節任務」卡（詳見 renderTaskCard）
  try {
    const withIface = await (await fetch(`${BASE}/api/nodes/L1.02`)).json();
    const f = withIface.interfaceFiles?.[0];
    check(Boolean(f) && (f.content ?? "").length > 20, "有介面的節點帶回唯讀介面內容",
      f ? `${f.name} ${f.content.length} bytes` : "（沒有介面檔）");
  } catch (err) {
    check(false, "有介面的節點帶回唯讀介面內容", err.message);
  }

  // ── 版面（headless 無法量測，只能守著關鍵宣告）──────────────────
  // 這三條就是「頁面不能滾動」的根因：grid 的隱含列是 auto、
  // grid 子元素預設 min-height:auto，兩者都會讓 overflow-y 失效。
  const cssText = await readFile(path.join(APP, "web", "styles.css"), "utf8");
  check(/\.layout\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)/s.test(cssText),
    "版面：.layout 有約束列高（否則子元素撐開、無法滾動）");
  check(/\.lesson\s*\{[^}]*min-height:\s*0/s.test(cssText),
    "版面：.lesson 可縮到視窗內");
  check(/\.workspace\s*\{[^}]*min-height:\s*0/s.test(cssText),
    "版面：.workspace 可縮到視窗內");
  check(/\.codePane\s*\{[^}]*min-height:\s*0/s.test(cssText),
    "版面：.codePane 可縮（結果面板才不會被推出畫面）");
}

// ── 模擬按「執行」────────────────────────────────────────────────────
if (withRun && booted) {
  const btn = document.getElementById("btnRun");
  const editorHost = document.getElementById("editor");
  const ta = editorHost.find?.((n) => n.tagName === "TEXTAREA");
  if (ta) ta.value = ta.value || "int main(){}";
  check(!btn.disabled, "執行按鈕可用");
  btn.dispatch("click");
  const gotReport = await waitFor(() => {
    const html = document.getElementById("results").deepHtml();
    return html.includes("runSummary") || html.includes("無法執行");
  }, 30000);
  const reportHtml = document.getElementById("results").deepHtml();
  check(gotReport, "按下執行後有結果面板", reportHtml.slice(0, 120));
  check(/runSummary/.test(reportHtml) || /無法執行/.test(reportHtml), "結果面板顯示裁決");
  check((reportHtml.match(/class="tag/g) ?? []).length > 0, "至少一個 grader 標籤");

  // 送出「故意編不過」的程式，驗證錯誤圖鑑的 chips 真的出現在結果面板
  if (ta) {
    ta.value = `#include <iostream>\nint main() {\n  std::cout << "x"\n}`;
    btn.dispatch("click");
    const gotAtlas = await waitFor(
      () => document.getElementById("results").deepHtml().includes("atlasChip"), 30000);
    const atlasHtml = document.getElementById("results").deepHtml();
    check(gotAtlas, "編譯錯誤會帶出錯誤圖鑑 chips");
    check(/少了分號|missing-semicolon|編譯/.test(atlasHtml), "chip 指向對應的圖鑑條目");
    // 點 chip 應開啟圖鑑並展開該條目
    const chip = document.getElementById("results").find?.((n) => n.className?.includes("atlasChip"));
    if (chip) {
      chip.dispatch("click");
      const opened = await waitFor(
        () => document.getElementById("modalBody").innerHTML.includes("atlasItem"), 15000);
      check(opened, "點 chip 會開啟圖鑑");
    } else {
      check(false, "結果面板有可點的 chip");
    }
  }
}

// ── 環境檢查視窗 ────────────────────────────────────────────────────
if (booted) {
  document.getElementById("btnDoctor").dispatch("click");
  const ok = await waitFor(() => document.getElementById("modalBody").innerHTML.includes("checkRow"), 20000);
  check(ok, "環境檢查視窗列出具體檢查項");
}

// ── 錯誤圖鑑 ────────────────────────────────────────────────────────
if (booted) {
  document.getElementById("btnAtlas").dispatch("click");
  const ok = await waitFor(() => document.getElementById("modalBody").innerHTML.includes("atlasItem"), 20000);
  let html = document.getElementById("modalBody").innerHTML;
  check(ok, "錯誤圖鑑列出條目");
  check(/atlasCount/.test(html), "圖鑑顯示條目數量", (html.match(/\d+ \/ \d+ 條/) ?? [""])[0]);
  check(/<details/.test(html) && /undefined reference/.test(html), "圖鑑條目含症狀與可展開內容");

  const search = document.getElementById("atlasSearch");
  if (search) {
    const gridRe = /(\d+) \/ (\d+) 條/;
    const total = Number(gridRe.exec(html)?.[2] ?? 0);
    search.dispatch("input", { target: { value: "undefined reference" } });
    const filtered = await waitFor(() => {
      const m = gridRe.exec(document.getElementById("modalBody").innerHTML);
      return m !== null && total > 0 && Number(m[1]) < total;
    }, 5000);
    html = document.getElementById("modalBody").innerHTML;
    check(filtered, "圖鑑搜尋可過濾", (gridRe.exec(html) ?? [""])[0]);
  } else {
    check(false, "圖鑑有搜尋框");
  }
}

// ── 圖鑑 → 相關課程 ─────────────────────────────────────────────────
if (booted) {
  const body = document.getElementById("modalBody");
  const chips = [...body.querySelectorAll(".linkChip[data-node]")];
  check(chips.length > 0, "圖鑑條目有「相關課程」連結", `${chips.length} 個`);
  if (chips.length > 0) {
    const target = chips[0].dataset.node ?? "(unknown)";
    chips[0].dispatch("click");
    const jumped = await waitFor(
      () => document.getElementById("modal")?.className.includes("hidden") === true,
      15000,
    );
    check(jumped, "點相關課程會關掉圖鑑（並載入該節）", target);
  }
}

// ── 間隔複習 ────────────────────────────────────────────────────────
// 卡片來源：課程的 concept 卡（伺服器啟動時同步）＋ 剛才故意踩錯產生的 error 卡
if (withRun && booted) {
  document.getElementById("reviewChip").dispatch("click");
  const listed = await waitFor(
    () => /reviewMeta|沒有到期的卡片/.test(document.getElementById("modalBody").innerHTML), 20000);
  let bodyHtml = document.getElementById("modalBody").innerHTML;
  check(listed, "複習視窗載入", bodyHtml.slice(0, 100).replace(/\s+/g, " "));

  const hasCards = /reviewMeta/.test(bodyHtml);
  if (hasCards) {
    check(true, "有到期卡片可複習（概念卡或錯誤卡）");
  } else {
    // 這不是失敗：同一份程式碼連續跑兩次時，第一次已把到期卡複習完。
    // 檢查「空佇列」的分支有正確訊息，並明說互動流程被略過（不要假裝驗過）。
    check(/沒有到期的卡片/.test(bodyHtml), "沒有到期卡片時顯示明確訊息");
    console.log("       （本輪沒有到期卡，複習互動流程略過；重置 DB 後可完整驗證）");
  }

  if (hasCards) {
    check(/class="cardSide"/.test(bodyHtml), "顯示卡片問題面");
    const reveal = document.getElementById("modalBody").find?.((n) => n.className?.includes("reviewReveal"));
    check(Boolean(reveal), "有「顯示答案」按鈕");
    if (reveal) {
      reveal.dispatch("click");
      await waitFor(() => /gradeRow/.test(document.getElementById("modalBody").deepHtml()), 5000);
      bodyHtml = document.getElementById("modalBody").deepHtml();
      check(/gradeRow/.test(bodyHtml), "揭曉後出現四個評分按鈕");
      check((bodyHtml.match(/ginterval/g) ?? []).length === 4, "每個按鈕都顯示下次間隔");

      // 按「想起來了」→ 應進到下一張或完成
      const goodBtn = document.getElementById("modalBody").find?.((n) => n.className?.includes("gradeBtn g3"));
      check(Boolean(goodBtn), "有「想起來了」按鈕");
      if (goodBtn) {
        const before = document.getElementById("modalBody").deepHtml();
        goodBtn.dispatch("click");
        const advanced = await waitFor(() => {
          const now = document.getElementById("modalBody").deepHtml();
          return now !== before && (/第 2 \//.test(now) || /都複習完了/.test(now) || /gradeRow/.test(now));
        }, 15000);
        const after = document.getElementById("modalBody").deepHtml();
        check(advanced, "評分後前進到下一張或完成", after.slice(0, 90).replace(/\s+/g, " "));
        check(/上一張排到/.test(after) || /都複習完了/.test(after), "顯示排程結果或完成訊息");
      }
    }
  }

  // ── 複習統計頁 ────────────────────────────────────────────────────
  const statsBtn = document.getElementById("btnReviewStats");
  check(Boolean(statsBtn), "複習視窗有「複習統計」按鈕");
  if (statsBtn) {
    statsBtn.dispatch("click");
    const shown = await waitFor(() => /statGrid/.test(document.getElementById("modalBody").deepHtml()), 15000);
    const html = document.getElementById("modalBody").deepHtml();
    check(shown, "複習統計頁載入");
    check((html.match(/statCard/g) ?? []).length >= 5, "統計頁有五個摘要數字");
    check(/最近 14 天的複習量/.test(html), "統計頁有每日複習量");
    check(/評分分布/.test(html), "統計頁有評分分布");
    check(/未來 7 天的到期預測/.test(html), "統計頁有未來到期預測");
    const back = document.getElementById("btnReviewBack");
    check(Boolean(back), "統計頁有「回複習」按鈕");
    if (back) {
      back.dispatch("click");
      const backOk = await waitFor(() => /reviewMeta|沒有到期的卡片/.test(document.getElementById("modalBody").innerHTML), 15000);
      check(backOk, "可以回到複習卡片");
    }
  }
}

console.log("");
if (asyncErrors.length) {
  console.log(`\x1b[31m非同步錯誤 ${asyncErrors.length} 個：\x1b[0m`);
  for (const e of asyncErrors.slice(0, 5)) console.log("  -", e.message);
  failures.push("非同步錯誤");
}
if (failures.length) {
  console.log(`\x1b[31m${failures.length} 項失敗\x1b[0m`);
  process.exit(1);
}
console.log("\x1b[32mUI 冒煙測試全部通過\x1b[0m");
// 必須明確結束：fetch 的 keep-alive socket 會讓 event loop 一直活著
process.exit(0);
