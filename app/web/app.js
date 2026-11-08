// CppForge：前端主程式（零框架、零打包）
//
// 為什麼不用 React/Vite：M0 的目標是驗證「讀 → 寫 → 跑 → 回饋 → 進度」，
// 不是驗證打包工具。原生 ES module + 字串模板已足夠，且啟動零延遲。
// 之後要換框架，只需要重寫這一層，API 契約不變。

// 相對路徑（而非 "/md.js"）：瀏覽器與 Node 的 DOM 冒煙測試都能解析同一個模組
import { renderMarkdown, escapeHtml } from "./md.js";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

const state = {
  levels: [],
  nodeId: null,
  node: null,
  editor: null,      // Monaco 或 textarea 的統一介面
  running: false,
  pendingCode: null, // 編輯器尚未載入完成時，先暫存要顯示的程式碼
};

// ── API ──────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...opts,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `HTTP ${res.status}`);
    err.code = data?.error;
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── 編輯器（Monaco，載入失敗則退回 textarea）─────────────────────────
function makeTextareaEditor(container) {
  container.innerHTML = "";
  const ta = el("textarea");
  ta.spellcheck = false;
  container.appendChild(ta);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const s = ta.selectionStart;
      ta.setRangeText("  ", s, ta.selectionEnd, "end");
      ta.dispatchEvent(new Event("input"));
    }
  });
  ta.addEventListener("input", () => { saveDraft(ta.value); });
  return {
    kind: "textarea",
    setValue: (v) => { ta.value = v; },
    getValue: () => ta.value,
    focus: () => ta.focus(),
    layout: () => {},
  };
}

async function loadMonaco(container, onChange) {
  if (typeof window.require !== "function") return null;
  try {
    window.MonacoEnvironment = {
      getWorkerUrl: () => URL.createObjectURL(new Blob(
        [`self.MonacoEnvironment={baseUrl:'/vendor/monaco/'};`
         + `importScripts('/vendor/monaco/vs/base/worker/workerMain.js');`],
        { type: "text/javascript" },
      )),
    };
    window.require.config({ paths: { vs: "/vendor/monaco/vs" } });

    const monaco = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("monaco timeout")), 6000);
      window.require(["vs/editor/editor.main"], (m) => { clearTimeout(timer); resolve(m); },
        () => { clearTimeout(timer); reject(new Error("monaco load error")); });
    });

    container.innerHTML = "";
    const ed = monaco.editor.create(container, {
      value: "",
      language: "cpp",
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13.5,
      fontFamily: "Cascadia Code, JetBrains Mono, Consolas, monospace",
      lineNumbersMinChars: 3,
      scrollBeyondLastLine: false,
      tabSize: 2,
      insertSpaces: true,
      renderWhitespace: "selection",
      padding: { top: 10 },
      wordBasedSuggestions: "off",
    });
    ed.onDidChangeModelContent(() => {
      const v = ed.getValue();
      saveDraft(v);
      onChange?.(v);
    });
    return {
      kind: "monaco",
      setValue: (v) => {
        const cur = ed.getModel();
        if (cur && cur.getValue() !== v) ed.setValue(v);
      },
      getValue: () => ed.getValue(),
      focus: () => ed.focus(),
      layout: () => ed.layout(),
    };
  } catch {
    return null;
  }
}

async function initEditor() {
  const host = $("editor");
  const onChange = () => markDirty(true);
  const monacoEd = await loadMonaco(host, onChange);
  state.editor = monacoEd ?? makeTextareaEditor(host);
  if (state.editor.kind !== "monaco") {
    $("fileName").textContent = "submission.cpp（純文字模式）";
  }
  if (state.pendingCode != null) {
    state.editor.setValue(state.pendingCode);
    state.pendingCode = null;
  }
  window.addEventListener("resize", () => state.editor?.layout());
}

// ── 草稿（localStorage，避免切換節點丟失）────────────────────────────
const draftKey = (id) => `cppforge:draft:${id}`;
function saveDraft(code) {
  if (!state.nodeId) return;
  try { localStorage.setItem(draftKey(state.nodeId), code); } catch { /* 忽略配額問題 */ }
}
function loadDraft(id) {
  try { return localStorage.getItem(draftKey(id)); } catch { return null; }
}
function clearDraft(id) {
  try { localStorage.removeItem(draftKey(id)); } catch { /* ignore */ }
}

const dirtyEl = () => $("runState");
function markDirty(dirty) {
  if (state.running) return;
  const s = dirtyEl();
  s.className = "runState";
  s.textContent = dirty ? "已修改（未執行）" : "";
}

// ── 側欄 ─────────────────────────────────────────────────────────────
function dotFor(n) {
  if (n.passed) return `<span class="dot passed">●</span>`;
  if (!n.unlocked) return `<span class="dot lock">🔒</span>`;
  if (n.attempts > 0) return `<span class="dot started">◐</span>`;
  return `<span class="dot todo">○</span>`;
}

function renderSidebar() {
  const box = $("sidebar");
  box.innerHTML = "";
  if (!state.levels.length) {
    box.appendChild(el("div", "hint", "還沒有內容。"));
    return;
  }
  for (const lv of state.levels) {
    const group = el("div", "levelGroup");
    const done = lv.nodes.filter((n) => n.passed).length;
    group.appendChild(el("div", "levelTitle",
      `${escapeHtml(lv.title)}<span class="count">${done}/${lv.nodes.length}</span>`));

    for (const n of lv.nodes) {
      const btn = el("button", `nodeItem${n.id === state.nodeId ? " active" : ""}${n.unlocked ? "" : " locked"}`);
      btn.type = "button";
      btn.disabled = !n.unlocked;
      btn.innerHTML = `${dotFor(n)}
        <span class="label"><span class="t">${escapeHtml(n.title)}</span>
        <span class="m">${n.minutes} 分鐘${n.attempts ? ` · 已試 ${n.attempts} 次` : ""}</span></span>`;
      if (n.unlocked) btn.addEventListener("click", () => openNode(n.id));
      else btn.title = `需要先通過：${n.blockedBy.join("、")}`;
      group.appendChild(btn);
    }
    box.appendChild(group);
  }
}

function updateProgress(stats) {
  if (stats) state.stats = stats;
  const all = state.levels.flatMap((l) => l.nodes);
  const passed = all.filter((n) => n.passed).length;
  $("progressText").textContent = `${passed} / ${all.length}`;
  $("progressBar").style.width = all.length ? `${(passed / all.length) * 100}%` : "0%";

  // 獨立完成率：第一次提交就通過的比例。這是「真的會了」而不是「試出來的」。
  const chip = $("statChip");
  const s = state.stats;
  if (!s || !passed) {
    chip.textContent = "";
    chip.style.display = "none";
  } else {
    chip.style.display = "";
    const pct = Math.round((s.independentRate ?? 0) * 100);
    chip.textContent = `獨立完成 ${s.firstTryPassed}/${passed}（${pct}%）`;
    chip.className = `chip ${pct >= 60 ? "ok" : ""}`;
  }
}

// ── 課文 ─────────────────────────────────────────────────────────────
// 題目在哪裡？兩種地方：
//   1. interface/*.hpp —— 不可修改的介面，就是「要實作什麼」的契約
//   2. 課文裡的任務段落
// 課文標題有六種寫法（見內容目錄），所以用「開頭關鍵詞」判斷，不要硬列完整標題。
const TASK_HEADING_TEXT = /^(你要實作|你要做的事|實作[:：])/;

const markdownHasTaskSection = (md) => String(md ?? "").split(/\r?\n/).some((line) => {
  const m = /^#{2,3}\s+(.+)$/.exec(line);
  return m ? TASK_HEADING_TEXT.test(m[1].trim()) : false;
});

// 沒有手寫 steps 時，依「這一節會跑哪些 grader」自動產生一份可執行的流程。
// 這比一句「請修改程式碼」有用得多：它告訴你「先做什麼、看到什麼算過」。
function defaultSteps(node) {
  // 注意：API 把 grader 清單放在 graderSummary.graders（不是 node.graders）
  const g = node.graderSummary?.graders ?? node.graders ?? [];
  const steps = [];
  if ((node.interfaceFiles ?? []).length) {
    steps.push("先讀下面的介面檔：型別、參數、回傳值就是規格，不能改。");
  }
  if (g.includes("compile")) {
    steps.push("改右側程式碼，先讓它「編譯」這一列變成 PASS（訊息的行號就是位置）。");
  }
  if (g.includes("unit_test")) {
    steps.push("看評測裡失敗的測試名稱 —— 那就是規格，一次修一個。");
  }
  if (g.includes("io_match")) {
    steps.push("用題目給的測資自己比對輸出：空白、換行、大小寫都算。");
  }
  if (g.includes("runtime_safety")) {
    steps.push("測試全過之後再看「記憶體安全」：洩漏或越界會單獨讓它 FAIL。");
  }
  if (g.includes("static_rules")) {
    steps.push("注意「靜態規則」：有些寫法被禁止，也有些寫法是**必須**使用的。");
  }
  if (g.includes("analyzer")) {
    steps.push("看「靜態分析」指出的行號 —— 那是分析器認為可疑的地方。");
  }
  if (!steps.length) steps.push("修改右側程式碼，讓評測全部通過。");
  return steps;
}

function renderTaskCard(node) {
  const files = node.interfaceFiles ?? [];
  const hasTaskSection = markdownHasTaskSection(node.lesson);
  const steps = (node.steps ?? []).length ? node.steps : defaultSteps(node);
  const hints = node.hints ?? [];

  const fileHtml = files.map((f) => `
    <details class="iface"${files.length === 1 ? " open" : ""}>
      <summary><code>${escapeHtml(f.name)}</code><span class="roTag">唯讀</span></summary>
      <pre><code>${escapeHtml(f.content)}</code></pre>
    </details>`).join("");

  const stepsHtml = `<ol class="taskSteps">${steps
    .map((s) => `<li>${renderMarkdown(s)}</li>`).join("")}</ol>`;

  const hintsHtml = hints.length
    ? `<div class="hintBox">
         <button type="button" class="ghost small" id="btnHint">看提示（0/${hints.length}）</button>
         <div class="hintList" id="hintList"></div>
       </div>`
    : "";

  return `<div class="taskCard">
    <div class="taskHead">
      <h4>本節任務</h4>
      ${hasTaskSection ? `<button type="button" class="ghost small" id="btnJumpTask">跳到題目 ↓</button>` : ""}
    </div>
    ${files.length ? `<div class="ifaceList">${fileHtml}</div>`
      : `<div class="taskHint">這一節沒有介面檔：直接改右側程式碼，讓評測全部通過。</div>`}
    <div class="taskStepsWrap"><h5>怎麼做</h5>${stepsHtml}</div>
    ${hintsHtml}
  </div>`;
}

function renderLesson(node) {
  const box = $("lesson");
  const pills = [
    `L${node.level}`,
    `${node.minutes} 分鐘`,
    ...(node.concepts ?? []).map((c) => `<span class="pill">${escapeHtml(c)}</span>`),
  ];
  const passedPill = node.passed ? `<span class="pill ok">已通過</span>` : "";

  const objectives = (node.objectives ?? []).length
    ? `<div class="objectives"><h4>學完你應該能做到</h4><ul>${node.objectives
        .map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul></div>`
    : "";

  box.innerHTML = `
    <h1>${escapeHtml(node.title)}</h1>
    <div class="kicker">
      <span class="pill">${pills[0]}</span>
      <span class="pill">${pills[1]}</span>
      ${passedPill}
      ${pills.slice(2).join("")}
    </div>
    ${objectives}
    ${renderTaskCard(node)}
    ${renderMarkdown(node.lesson)}
  `;

  // 給任務段落一個 id，讓「跳到題目」有地方可去。
  // 注意：querySelectorAll 回傳 NodeList（**沒有 find/map**），要用 for...of 或 Array.from。
  // 任務段落可能是 h2 或 h3，兩種都要找。
  let taskHeading = null;
  for (const h of [...box.querySelectorAll("h2"), ...box.querySelectorAll("h3")]) {
    if (TASK_HEADING_TEXT.test((h.textContent ?? "").trim())) {
      h.id = "taskSection";
      taskHeading = h;
      break;
    }
  }
  const jump = $("btnJumpTask");
  if (jump) {
    jump.addEventListener("click", () => {
      if (!taskHeading) return;
      if (typeof taskHeading.scrollIntoView === "function") {
        taskHeading.scrollIntoView({ block: "start", behavior: "smooth" });
      } else {
        box.scrollTop = taskHeading.offsetTop ?? 0;
      }
    });
  }

  // 提示一次揭露一個：先自己想，想不出來再看下一條
  const hintBtn = $("btnHint");
  const hintList = $("hintList");
  if (hintBtn && hintList) {
    const hints = node.hints ?? [];
    let shown = 0;
    hintBtn.addEventListener("click", () => {
      if (shown >= hints.length) return;
      hintList.appendChild(el("div", "hintItem", renderMarkdown(hints[shown])));
      shown += 1;
      hintBtn.textContent = shown >= hints.length
        ? `提示已全部顯示（${shown}/${hints.length}）`
        : `看提示（${shown}/${hints.length}）`;
      if (shown >= hints.length) hintBtn.disabled = true;
    });
  }

  if ((node.drills ?? []).length) box.appendChild(renderDrills(node.drills));
  box.scrollTop = 0;
}

function normalizeAnswer(s) {
  return String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim()
    .replace(/^["'「」]+|["'「」]+$/g, "");
}

function renderDrills(drills) {
  const wrap = el("div", "drills", `<h3>即時練習</h3>`);
  drills.forEach((d, i) => {
    const card = el("div", "drill");
    const accept = [d.answer, ...(d.accept ?? [])].map(normalizeAnswer);
    card.appendChild(el("div", "q", `<span class="num">${i + 1}.</span>${renderMarkdown(d.prompt)}`));

    if (d.code) {
      card.appendChild(el("div", "codeBlock",
        `<pre><code>${escapeHtml(d.code)}</code></pre>`));
    }

    // 選擇題：直接點選項就有回饋（不需要下拉 + 送出）。
    // 內容 CI 規定即時練習一律是 choice，所以這是主要路徑。
    if (d.choices?.length) {
      const list = el("div", "optList");
      const fb = el("div", "feedback");
      let solved = false;
      const buttons = d.choices.map((c) => {
        const btn = el("button", "optBtn", escapeHtml(c));
        btn.type = "button";
        btn.addEventListener("click", () => {
          if (solved) return;
          const ok = accept.includes(normalizeAnswer(c));
          btn.classList.add(ok ? "ok" : "bad");
          fb.className = `feedback ${ok ? "ok" : "bad"}`;
          fb.textContent = ok ? "正確 ✓" : "再想想 —— 這個選項不對。";
          if (ok) {
            solved = true;
            card.classList.add("solved");
            for (const b of buttons) b.disabled = true;
            if (d.explain) card.appendChild(el("div", "explain", renderMarkdown(d.explain)));
          }
        });
        list.appendChild(btn);
        return btn;
      });
      card.appendChild(list);
      card.appendChild(fb);
      wrap.appendChild(card);
      return;
    }

    // 後備：文字輸入（內容 CI 已禁止，保留給舊資料避免整個區塊爆掉）
    const row = el("div", "row");
    const input = el("input");
    input.type = "text";
    input.placeholder = d.placeholder ?? "輸入你的答案";
    const btn = el("button", "ghost small", "檢查");
    const fb2 = el("div", "feedback");
    row.append(input, btn);
    card.appendChild(row);
    card.appendChild(fb2);

    const check = () => {
      const ok = accept.includes(normalizeAnswer(input.value));
      fb2.className = `feedback ${ok ? "ok" : "bad"}`;
      fb2.textContent = ok ? "正確 ✓" : "再想想 —— 提示：把程式碼從上到下走一遍，追蹤每個變數的值。";
      if (ok && d.explain) card.appendChild(el("div", "explain", renderMarkdown(d.explain)));
    };
    btn.addEventListener("click", check);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });

    wrap.appendChild(card);
  });
  return wrap;
}

// ── 開啟節點 ─────────────────────────────────────────────────────────
async function openNode(id) {
  if (state.running) return;
  state.nodeId = id;
  localStorage.setItem("cppforge:lastNode", id);
  renderSidebar();

  const node = await api(`/api/nodes/${encodeURIComponent(id)}`);
  state.node = node;
  renderLesson(node);

  const draft = loadDraft(id);
  const code = draft ?? node.lastCode ?? node.starter;
  if (state.editor) state.editor.setValue(code);
  else state.pendingCode = code;   // 編輯器還在載入，先存起來
  if (draft && draft !== (node.lastCode ?? node.starter)) markDirty(true);
  else markDirty(false);

  $("btnRun").disabled = !node.unlocked;
  if (!node.unlocked) {
    $("results").innerHTML = `<div class="results-empty">這一節尚未解鎖，請先通過：${escapeHtml(node.prerequisites.join("、"))}</div>`;
  } else {
    $("results").innerHTML = `<div class="results-empty">按「執行」送出這份程式碼；評測會編譯、跑隱藏測試、檢查記憶體與禁用寫法。</div>`;
  }
  const names = node.interfaceFiles?.map((f) => f.name) ?? [];
  const subName = node.submissionName ?? "submission.cpp";
  $("fileName").textContent = names.length
    ? `${subName}（介面：${names.join(", ")} 唯讀）`
    : subName;
}

// ── 執行與結果 ───────────────────────────────────────────────────────
function setRunning(on) {
  state.running = on;
  const btn = $("btnRun");
  btn.disabled = on;
  const s = dirtyEl();
  s.className = `runState${on ? " busy" : ""}`;
  s.textContent = on ? "編譯與執行中…" : "";
}

function tagOf(status) {
  const map = { pass: "pass", fail: "fail", skip: "skip", warn: "warn" };
  const label = { pass: "PASS", fail: "FAIL", skip: "SKIP", warn: "WARN" };
  const cls = map[status] ?? "skip";
  return `<span class="tag ${cls}">${label[status] ?? status}</span>`;
}

function renderReport(report, saved) {
  const box = $("results");
  box.innerHTML = "";

  const sum = el("div", `runSummary ${report.passed ? "pass" : "fail"}`);
  sum.innerHTML = `<span class="verdict">${report.passed ? "通過" : "尚未通過"}</span>
    <span>${report.passed
      ? (saved?.firstPass ? "首次提交就通過 —— 這是「獨立完成」的證據" : "所有必要檢查都過了")
      : "看下面的檢查項目，一次修一個問題"}</span>
    <span class="timing">${report.timing.totalMs} ms</span>`;
  box.appendChild(sum);

  for (const r of report.results ?? []) {
    const row = el("div", "grader");
    row.innerHTML = `${tagOf(r.status)}
      <div class="body">
        <div class="label">${escapeHtml(r.label ?? r.id)}</div>
        <div class="detail">${escapeHtml(r.detail ?? "")}</div>
        ${(r.messages ?? []).length
          ? `<ul>${r.messages.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>` : ""}
      </div>`;
    box.appendChild(row);
  }

  // 錯誤圖鑑：命中的條目做成可點擊的 chips（用 createElement 以便冒煙測試驗證）
  if ((report.atlas ?? []).length) {
    const wrap = el("div", "atlasHits");
    wrap.appendChild(el("div", "atlasHitsHead", "錯誤圖鑑 —— 點開看原因與修法"));
    for (const a of report.atlas) {
      const btn = el("button", "atlasChip", `${escapeHtml(a.stage)} · ${escapeHtml(a.title)}`);
      btn.type = "button";
      btn.addEventListener("click", () => showAtlas(a.id));
      wrap.appendChild(btn);
    }
    box.appendChild(wrap);
  }

  if ((report.hints ?? []).length) {
    const h = el("div", "hints", `<h4>教學提示</h4><ul>${report.hints
      .map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`);
    box.appendChild(h);
  }

  if ((report.diagnostics ?? []).length) {
    const d = el("div", "diags");
    d.innerHTML = `<div style="color:var(--text-faint);margin-bottom:4px">編譯器診斷</div>` +
      report.diagnostics.slice(0, 8).map((x) =>
        `<div class="d"><span class="loc">${escapeHtml(x.file)}:${x.line}:${x.column}</span>
         ${escapeHtml(x.severity)}: ${escapeHtml(x.message)}</div>`).join("");
    box.appendChild(d);
  }
  box.scrollTop = 0;
}

async function run() {
  if (!state.nodeId || state.running) return;
  if (!state.node?.unlocked) return;   // Ctrl+Enter 也必須遵守解鎖規則
  const code = state.editor?.getValue() ?? "";
  setRunning(true);
  $("results").innerHTML = `<div class="results-empty">編譯與執行中…（首次執行會先建置沙箱，約需數秒）</div>`;

  try {
    const data = await api(`/api/nodes/${encodeURIComponent(state.nodeId)}/run`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    renderReport(data.report, data.saved);
    if (data.levels) {
      state.levels = data.levels;
      renderSidebar();
      updateProgress(data.stats);
    }
    if (data.report.passed) {
      clearDraft(state.nodeId);
      state.node.passed = true;
    }
    if (data.newCards > 0) {
      const note = el("div", "newCardsNote",
        `這次的錯誤已加入複習（${data.newCards} 張錯誤卡），之後會在你快忘記時出現。`);
      $("results").appendChild(note);
    }
    refreshReviewChip();
    dirtyEl().className = "runState";
    dirtyEl().textContent = data.report.passed ? "已通過" : "未通過";
  } catch (err) {
    const missing = err.code === "TOOLCHAIN_MISSING";
    $("results").innerHTML = `<div class="runSummary fail">
      <span class="verdict">無法執行</span>
      <span>${escapeHtml(err.message)}</span></div>
      ${missing ? `<div class="hints"><h4>怎麼修</h4><ul>
        <li>點右上角「環境檢查」，按「安裝工具鏈」（約 65 MB，一次性）。</li></ul></div>` : ""}`;
    dirtyEl().className = "runState";
    dirtyEl().textContent = "執行失敗";
  } finally {
    setRunning(false);
    if (!state.running) $("btnRun").disabled = !(state.node?.unlocked ?? false);
  }
}

// ── 環境檢查 ─────────────────────────────────────────────────────────
function statusTag(s) {
  if (s === "pass") return `<span class="tag pass">PASS</span>`;
  if (s === "fail") return `<span class="tag fail">FAIL</span>`;
  if (s === "warn") return `<span class="tag warn">WARN</span>`;
  return `<span class="tag skip">SKIP</span>`;
}

// ── 錯誤圖鑑 ─────────────────────────────────────────────────────────
// 設計：`<details>` 原生可展開，不需要額外狀態；搜尋用 innerHTML 重新渲染，
// 因為條目是純文字（沒有事件），重建比逐一隱藏簡單且不會漏。
let atlasCache = null;

async function loadAtlas() {
  if (!atlasCache) atlasCache = (await api("/api/atlas")).entries ?? [];
  return atlasCache;
}

function atlasEntryHtml(e, openId) {
  const related = (e.related ?? []).length
    ? `<div class="related"><span class="lbl">相關課程</span>${e.related
      .map((n) => `<button type="button" class="linkChip" data-node="${escapeHtml(n.id)}">${escapeHtml(n.id)} ${escapeHtml(n.title)}</button>`)
      .join("")}</div>`
    : "";
  return `<details class="atlasItem"${e.id === openId ? " open" : ""}>
    <summary><span class="stageTag">${escapeHtml(e.stage)}</span><span class="atlasTitle">${escapeHtml(e.title)}</span></summary>
    <div class="atlasBody">
      <div class="sym"><span class="lbl">症狀</span><code>${escapeHtml(e.symptom)}</code></div>
      <div class="why"><span class="lbl">為什麼</span>${escapeHtml(e.why)}</div>
      <div class="fixes"><span class="lbl">怎麼修</span><ul>${(e.fixes ?? [])
        .map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul></div>
      <div class="codePair">
        <div class="codeBad"><span class="lbl bad">✗ 常見寫法</span><pre><code>${escapeHtml(e.bad ?? "")}</code></pre></div>
        <div class="codeGood"><span class="lbl good">✓ 修法</span><pre><code>${escapeHtml(e.good ?? "")}</code></pre></div>
      </div>
      ${related}
    </div>
  </details>`;
}

async function showAtlas(focusId = null) {
  $("modal").classList.remove("hidden");
  $("modalTitle").textContent = "錯誤圖鑑";
  $("modalBody").innerHTML = `<div class="results-empty">載入中…</div>`;

  let entries;
  try {
    entries = await loadAtlas();
  } catch (err) {
    $("modalBody").innerHTML = `<div class="banner bad">無法載入圖鑑：${escapeHtml(err.message)}</div>`;
    return;
  }

  const paint = (keyword) => {
    const kw = keyword.trim().toLowerCase();
    const hits = kw
      ? entries.filter((e) => `${e.title} ${e.stage} ${e.symptom} ${e.why} ${(e.fixes ?? []).join(" ")}`
          .toLowerCase().includes(kw))
      : entries;
    $("modalBody").innerHTML = `
      <div class="atlasBar">
        <input type="text" id="atlasSearch" placeholder="搜尋：undefined / 越界 / 分號 / const…" value="${escapeHtml(keyword)}" />
        <span class="atlasCount">${hits.length} / ${entries.length} 條</span>
      </div>
      ${hits.length ? hits.map((e) => atlasEntryHtml(e, focusId)).join("")
        : `<div class="results-empty">找不到符合「${escapeHtml(keyword)}」的條目。試試編譯器訊息裡的關鍵字。</div>`}`;
    const input = $("atlasSearch");
    if (input) {
      input.addEventListener("input", (ev) => {
        const caret = ev.target.value;
        paint(caret);
        const again = $("atlasSearch");
        if (again) { again.focus(); again.value = caret; }
      });
    }
    // 「相關課程」chip：關掉圖鑑並直接跳到那一節
    for (const chip of $("modalBody").querySelectorAll(".linkChip[data-node]")) {
      chip.addEventListener("click", () => {
        const id = chip.dataset.node;
        $("modal").classList.add("hidden");
        openNode(id).catch(() => {});
      });
    }
  };

  paint("");
}

// ── 間隔複習（FSRS 形式）───────────────────────────────────────────
// 卡片來自兩處：課程的 concept 卡、以及你踩過的錯誤變成的 error 卡。
const reviewState = { cards: [], idx: 0, revealed: false, lastResult: null };

const GRADE_NAMES = { 1: "忘記了", 2: "很吃力", 3: "想起來了", 4: "太簡單" };

async function refreshReviewChip() {
  const chip = $("reviewChip");
  if (!chip) return;
  try {
    const s = await api("/api/review/stats");
    const due = s.due ?? 0;
    chip.hidden = due === 0;
    if (due > 0) chip.textContent = `複習 ${due}`;
    chip.title = `待複習 ${due} 張 · 已學 ${s.learned ?? 0} / 共 ${s.total ?? 0} 張`
      + (s.recentRetention != null ? ` · 近期記得率 ${Math.round(s.recentRetention * 100)}%` : "");
  } catch {
    chip.hidden = true;
  }
}

async function showReview() {
  $("modal").classList.remove("hidden");
  $("modalTitle").textContent = "複習";
  $("modalBody").innerHTML = `<div class="results-empty">載入中…</div>`;

  let data;
  try {
    data = await api("/api/review?limit=20");
  } catch (err) {
    $("modalBody").innerHTML = `<div class="banner bad">無法載入複習卡：${escapeHtml(err.message)}</div>`;
    return;
  }
  reviewState.cards = data.cards ?? [];
  reviewState.idx = 0;
  reviewState.revealed = false;
  reviewState.lastResult = null;
  paintReview();
}

function paintReview() {
  const body = $("modalBody");
  const { cards, idx, revealed, lastResult } = reviewState;

  const withToolbar = (html) => {
    body.innerHTML = `<div class="reviewToolbar">
        <button type="button" class="ghost" id="btnReviewStats">複習統計</button>
      </div>${html}`;
    const btn = $("btnReviewStats");
    if (btn) btn.addEventListener("click", () => { showReviewInsights().catch(() => {}); });
  };

  if (!cards.length) {
    withToolbar(`<div class="banner ok"><span class="tag pass">OK</span>
      <span>目前沒有到期的卡片。</span></div>
      <div class="results-empty">卡片會在「該忘的時候」自動出現（依穩定度排程）。
      多解幾個節點、或故意踩錯一次，就會開始累積複習卡。</div>`);
    return;
  }

  if (idx >= cards.length) {
    withToolbar(`<div class="banner ok"><span class="tag pass">完成</span>
      <span>這一輪 ${cards.length} 張都複習完了。</span></div>
      <div class="results-empty">下次到期時間已依你的評分排好。關掉視窗即可繼續寫程式。</div>`);
    refreshReviewChip();
    return;
  }

  const card = cards[idx];
  const kindLabel = card.kind === "error" ? "錯誤卡" : "概念卡";
  withToolbar(`
    <div class="reviewMeta">
      <span>第 ${idx + 1} / ${cards.length} 張</span>
      <span class="kindTag ${card.kind}">${kindLabel}</span>
      <span class="muted">${card.reps > 0 ? `已複習 ${card.reps} 次` : "新卡"}</span>
      ${lastResult ? `<span class="scheduled">上一張排到 ${escapeHtml(lastResult)} 後</span>` : ""}
    </div>
    <div class="reviewCard"><div class="cardSide">問題</div>${renderMarkdown(card.front)}</div>`);

  if (!revealed) {
    const btn = el("button", "primary reviewReveal", "顯示答案");
    btn.type = "button";
    btn.addEventListener("click", () => { reviewState.revealed = true; paintReview(); });
    body.appendChild(btn);
    return;
  }

  body.appendChild(el("div", "reviewCard back",
    `<div class="cardSide">答案</div>${renderMarkdown(card.back)}`));

  const row = el("div", "gradeRow");
  for (const g of [1, 2, 3, 4]) {
    const label = card.intervalLabels?.[g] ?? "—";
    const btn = el("button", `gradeBtn g${g}`,
      `<span class="glabel">${GRADE_NAMES[g]}</span><span class="ginterval">${escapeHtml(label)}</span>`);
    btn.type = "button";
    btn.addEventListener("click", () => submitGrade(card.id, g));
    row.appendChild(btn);
  }
  body.appendChild(row);
}

// ── 複習統計 ─────────────────────────────────────────────────────────
// 為什麼要有這一頁：`reviews` 表記錄了每一次評分，但沒有它，學員看不到
// 「我到底記不記得」、「卡片什麼時候會回來」。資料一直都在，只缺一個視窗。
async function showReviewInsights() {
  $("modal").classList.remove("hidden");
  $("modalTitle").textContent = "複習統計";
  const body = $("modalBody");
  body.innerHTML = `<div class="results-empty">載入中…</div>`;

  let d;
  try {
    d = await api("/api/review/insights");
  } catch (err) {
    body.innerHTML = `<div class="banner bad">無法載入統計：${escapeHtml(err.message)}</div>`;
    return;
  }

  const gradeNames = { 1: "忘記了", 2: "很吃力", 3: "想起來了", 4: "太簡單" };
  const maxDay = Math.max(1, ...d.days.map((x) => x.total));
  const maxForecast = Math.max(1, ...d.forecast.map((x) => x.count));
  const gradedTotal = Math.max(1, d.gradedTotal ?? 0);

  const dayRows = d.days.map((x) => `
    <div class="statRow">
      <span class="statLabel">${escapeHtml(x.day.slice(5))}</span>
      <div class="barWrap"><div class="bar" style="width:${Math.round((x.total / maxDay) * 100)}%"></div></div>
      <span class="statValue">${x.total}</span>
    </div>`).join("");

  const gradeRows = [1, 2, 3, 4].map((g) => `
    <div class="statRow">
      <span class="statLabel">${gradeNames[g]}</span>
      <div class="barWrap"><div class="bar g${g}" style="width:${Math.round(((d.grades[g] ?? 0) / gradedTotal) * 100)}%"></div></div>
      <span class="statValue">${d.grades[g] ?? 0}</span>
    </div>`).join("");

  const forecastRows = d.forecast.map((x) => `
    <div class="statRow">
      <span class="statLabel">${escapeHtml(x.day.slice(5))}</span>
      <div class="barWrap"><div class="bar f" style="width:${Math.round((x.count / maxForecast) * 100)}%"></div></div>
      <span class="statValue">${x.count}</span>
    </div>`).join("");

  const retention = d.recentRetention == null ? "—" : `${Math.round(d.recentRetention * 100)}%`;

  body.innerHTML = `
    <div class="reviewToolbar">
      <button type="button" class="ghost" id="btnReviewBack">回複習</button>
    </div>
    <div class="statGrid">
      <div class="statCard"><span class="statNum">${d.total ?? 0}</span><span class="statName">卡片總數</span></div>
      <div class="statCard"><span class="statNum">${d.learned ?? 0}</span><span class="statName">已學過</span></div>
      <div class="statCard"><span class="statNum">${d.due ?? 0}</span><span class="statName">待複習</span></div>
      <div class="statCard"><span class="statNum">${d.reviewsToday ?? 0}</span><span class="statName">今日複習</span></div>
      <div class="statCard"><span class="statNum">${retention}</span><span class="statName">近期記得率</span></div>
    </div>
    <h4 class="statHeading">最近 14 天的複習量</h4>
    <div class="statBars">${dayRows}</div>
    <h4 class="statHeading">評分分布（累計 ${d.gradedTotal ?? 0} 次）</h4>
    <div class="statBars">${gradeRows}</div>
    <h4 class="statHeading">未來 7 天的到期預測</h4>
    <div class="statBars">${forecastRows}</div>`;

  const back = $("btnReviewBack");
  if (back) back.addEventListener("click", () => { showReview().catch(() => {}); });
}

async function submitGrade(cardId, grade) {  const body = $("modalBody");
  body.innerHTML = `<div class="results-empty">排程中…</div>`;
  try {
    const res = await api(`/api/review/${cardId}`, {
      method: "POST",
      body: JSON.stringify({ grade }),
    });
    reviewState.idx += 1;
    reviewState.revealed = false;
    reviewState.lastResult = res.intervalLabel ?? null;
    paintReview();
    refreshReviewChip();
  } catch (err) {
    body.innerHTML = `<div class="banner bad">排程失敗：${escapeHtml(err.message)}</div>`;
  }
}

async function showDoctor() {
  $("modal").classList.remove("hidden");
  $("modalTitle").textContent = "環境檢查";
  $("modalBody").innerHTML = `<div class="results-empty">檢查中…</div>`;

  let report;
  try {
    report = await api("/api/doctor");
  } catch (err) {
    $("modalBody").innerHTML = `<div class="banner bad">無法取得環境報告：${escapeHtml(err.message)}</div>`;
    return;
  }

  const banner = report.ready
    ? `<div class="banner ok"><span class="tag pass">OK</span>
       <span>環境就緒：可以編譯、可以執行、評測可用。</span></div>`
    : `<div class="banner bad"><span class="tag fail">!</span>
       <span>有 ${report.failed} 項檢查未通過。最常見的是還沒安裝工具鏈。</span>
       <button class="primary small" id="btnInstall" style="margin-left:auto">安裝工具鏈（約 65 MB）</button></div>`;

  $("modalBody").innerHTML = banner + report.checks.map((c) => `
    <div class="checkRow">
      ${statusTag(c.status)}
      <div>
        <div class="name">${escapeHtml(c.label)}</div>
        <div class="detail">${escapeHtml(c.detail ?? "")}</div>
        ${c.hint ? `<div class="hint">${escapeHtml(c.hint)}</div>` : ""}
      </div>
    </div>`).join("");

  const install = $("btnInstall");
  if (install) {
    install.addEventListener("click", async () => {
      install.disabled = true;
      install.textContent = "下載與解壓中…（約 30 秒）";
      try {
        const res = await api("/api/doctor/install", { method: "POST" });
        $("modalBody").innerHTML = `<div class="banner ${res.ok ? "ok" : "bad"}">
          <span>${res.ok ? "工具鏈安裝完成" : "安裝失敗（exit=" + res.exitCode + "）"}</span></div>
          <pre class="mono" style="white-space:pre-wrap;color:var(--text-dim)">${escapeHtml(res.log ?? "")}</pre>`;
        setTimeout(() => refreshEnvChip(), 500);
      } catch (err) {
        install.textContent = `安裝失敗：${err.message}`;
      }
    });
  }
}

async function refreshEnvChip() {
  const chip = $("envChip");
  try {
    const d = await api("/api/doctor");
    const ok = d.checks.find((c) => c.id === "toolchain")?.status === "pass";
    chip.className = `chip ${ok ? "ok" : "bad"}`;
    chip.textContent = ok ? "環境就緒" : "需要安裝工具鏈";
  } catch {
    chip.className = "chip bad";
    chip.textContent = "服務異常";
  }
}

// ── 啟動 ─────────────────────────────────────────────────────────────
async function boot() {
  $("btnRun").addEventListener("click", run);
  $("btnReset").addEventListener("click", () => {
    if (!state.node) return;
    state.editor?.setValue(state.node.starter);
    clearDraft(state.nodeId);
    markDirty(true);
  });
  $("btnDoctor").addEventListener("click", showDoctor);
  $("btnAtlas").addEventListener("click", () => showAtlas());
  $("reviewChip").addEventListener("click", showReview);
  $("modalClose").addEventListener("click", () => $("modal").classList.add("hidden"));
  $("modal").addEventListener("click", (e) => {
    if (e.target === $("modal")) $("modal").classList.add("hidden");
  });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
  });

  // 編輯器與課程並行載入：不要為了等 Monaco 而讓側欄空白好幾秒
  initEditor();
  refreshEnvChip();
  refreshReviewChip();

  try {
    const course = await api("/api/course");
    state.levels = course.levels ?? [];
    renderSidebar();
    updateProgress(course.stats);

    const all = state.levels.flatMap((l) => l.nodes);
    const saved = localStorage.getItem("cppforge:lastNode");
    const pick = all.find((n) => n.id === saved && n.unlocked)
      ?? all.find((n) => n.unlocked && !n.passed)
      ?? all.filter((n) => n.unlocked).pop()
      ?? all[0];
    if (pick) await openNode(pick.id);
  } catch (err) {
    $("sidebar").innerHTML = `<div class="hint">載入課程失敗：${escapeHtml(err.message)}</div>`;
  }
}

boot();
