// CppForge 產品：評測引擎
//
// 由 POC（poc/runner/run.mjs）驗證過的流程產品化：
//   1. 把提交寫進「ASCII 建置目錄」
//   2. 依節點宣告的 graders 逐一評測
//   3. 全部在 Win32 Job Object 沙箱裡執行
//   4. 輸出結構化報告（含教學提示）
//
// 輸出契約刻意保持與 POC 相同，方便比對與回歸測試。

import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BUILD_ROOT, GXX, LIB_DIR, RUNS_DIR, SANDBOX_EXE, assertAscii,
} from "./config.mjs";
import { matchAtlas } from "./atlas.mjs";

const exists = (p) => stat(p).then(() => true, () => false);

/** 執行外部程式，輸出重定向到檔案（沙箱下不可用 pipe；也避免死鎖） */
function run(exe, args, { cwd, timeoutMs = 90000, tag = "run" } = {}) {
  const outF = path.join(cwd, `.${tag}.out.txt`);
  const errF = path.join(cwd, `.${tag}.err.txt`);
  const o = openSync(outF, "w");
  const e = openSync(errF, "w");
  return new Promise((resolve) => {
    const p = spawn(exe, args, { cwd, stdio: ["ignore", o, e], windowsHide: true });
    const t = setTimeout(() => {
      spawn("taskkill", ["/PID", String(p.pid), "/T", "/F"], { stdio: "ignore" });
    }, timeoutMs);
    p.on("error", (err) => {
      clearTimeout(t);
      closeSync(o); closeSync(e);
      resolve({ code: -1, out: "", err: String(err.message) });
    });
    p.on("close", async (code) => {
      clearTimeout(t);
      closeSync(o); closeSync(e);
      resolve({
        code: code ?? -1,
        out: await readFile(outF, "utf8").catch(() => ""),
        err: await readFile(errF, "utf8").catch(() => ""),
      });
    });
  });
}

// ── 診斷解析與教學提示 ──────────────────────────────────────────────

const DIAG_RE = /^(.*?):(\d+):(\d+):\s*(fatal error|error|warning|note):\s*(.*)$/;

const HINTS = [
  { match: /undefined reference to/i,
    hint: "連結錯誤：有宣告（header）但沒有定義。檢查是否漏了 .cpp、函式簽章是否完全一致（含 const）。" },
  { match: /multiple definition of/i,
    hint: "同一個符號被定義兩次：通常是 header 裡定義了非 inline 函式或全域變數。" },
  { match: /no matching function for call/i,
    hint: "找不到可用的多載：多半是參數型別或 const 不一致（例如把 const 物件傳給非 const 參考）。" },
  { match: /was not declared in this scope/i,
    hint: "名稱不在這個作用域：檢查拼字、是否漏 include、是否忘了 std::。" },
  { match: /expected [';]/i,
    hint: "語法錯誤：通常是前一行漏了分號，或括號沒配對。" },
  { match: /cannot convert/i,
    hint: "型別轉換失敗：檢查 explicit 建構子、隱式轉換是否被禁止。" },
  { match: /redefinition of/i,
    hint: "同一作用域重複定義：檢查是否有兩份宣告，或 header 缺 include guard。" },
  { match: /control reaches end of non-void function/i,
    hint: "函式有回傳值但某條路徑沒有 return ——這是未定義行為，不是普通警告。" },
  { match: /unused (variable|parameter)/i,
    hint: "未使用的變數或參數：用 [[maybe_unused]] 表達意圖，或直接刪掉。" },
  { match: /comparison of integer expressions of different signedness/i,
    hint: "有號/無號比較：size_t 是無號，和 int 比會出問題。優先用 std::size_t 或 std::ssize()。" },
];

const RUNTIME_HINTS = [
  { match: /LEAKCHECK: \d+ leaked/,
    hint: "記憶體洩漏：有 new 卻沒有對應的 delete。練習目標是讓 RAII 物件替你管理。" },
  { match: /out-of-bounds|_GLIBCXX_DEBUG|Assertion/i,
    hint: "邊界檢查抓到越界：索引超出 size()，或迭代器已失效。" },
  { match: /stack buffer overrun|STATUS_STACK_BUFFER_OVERRUN/i,
    hint: "堆疊溢位：寫入超過陣列大小，這是最危險的一類記憶體錯誤。" },
];

function parseDiagnostics(stderr) {
  const out = [];
  for (const line of String(stderr || "").split(/\r?\n/)) {
    const m = DIAG_RE.exec(line.trim());
    if (!m) continue;
    out.push({
      file: m[1].replace(/\\/g, "/").split("/").pop(),
      line: Number(m[2]),
      column: Number(m[3]),
      severity: m[4] === "fatal error" ? "error" : m[4],
      message: m[5],
    });
    if (out.length >= 40) break;
  }
  return out;
}

function hintsFor(diagnostics, stderr) {
  const hay = [stderr || "", ...diagnostics.map((d) => d.message)].join("\n");
  const found = [];
  for (const h of [...HINTS, ...RUNTIME_HINTS]) {
    if (h.match.test(hay) && !found.includes(h.hint)) found.push(h.hint);
  }
  return found.slice(0, 4);
}

/** 把建置目錄絕對路徑從訊息中抹掉（學員不該看到暫存路徑） */
const scrub = (s, buildDir) =>
  String(s ?? "")
    .split(buildDir + "\\").join("")
    .split(buildDir + "/").join("")
    .split(buildDir).join("");

/** 從測試輸出萃取失敗清單 */
function extractFailures(stdout, buildDir) {
  const lines = String(stdout ?? "").split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; ++i) {
    const m = /^\[FAIL\]\s+(.*)$/.exec(lines[i]);
    if (!m) continue;
    const details = [];
    while (i + 1 < lines.length && /^\s{4,}\S/.test(lines[i + 1])) details.push(lines[++i].trim());
    out.push(details.length ? `${m[1]} — ${details.join("；")}` : m[1]);
  }
  return out.map((s) => scrub(s, buildDir));
}

/**
 * 擷取「非 file:line:col 格式」的錯誤行。
 * 連結器（ld.exe）的訊息長這樣：
 *   C:/…/bin/ld.exe: C:\…\Temp\xxxx.o:tests.cpp:(.text+0x38f): undefined reference to `square_area(int)'
 * 前面全是噪音，學員只需要最後那一段。所以用樣式比對抽出關鍵子句。
 */
function extractErrorLines(stderr, buildDir, max = 5) {
  const patterns = [
    /undefined reference to .*/i,
    /multiple definition of .*/i,
    /cannot find .*/i,
    /No such file or directory.*/i,
    /collect2: .*/i,
  ];
  const seen = new Set();
  const out = [];
  for (const line of String(stderr ?? "").split(/\r?\n/)) {
    const raw = scrub(line.trim(), buildDir);
    if (!raw) continue;
    let picked = null;
    for (const re of patterns) {
      const m = re.exec(raw);
      if (m) { picked = m[0]; break; }
    }
    if (!picked) continue;
    if (picked.length > 160) picked = `${picked.slice(0, 157)}…`;
    if (seen.has(picked)) continue;
    seen.add(picked);
    out.push(picked);
    if (out.length >= max) break;
  }
  return out;
}

// ── 沙箱 ────────────────────────────────────────────────────────────

export async function ensureSandbox() {
  const src = path.join(LIB_DIR, "sandbox.cpp");
  const srcStat = await stat(src).catch(() => null);
  if (!srcStat) throw new Error(`找不到沙箱原始碼：${src}`);

  // 原始碼比執行檔新就重建。不這樣做的話，改了 sandbox.cpp 卻跑舊 binary，
  // 會出現「明明加了新參數卻說 unknown option」這種鬼打牆。
  const exeStat = await stat(SANDBOX_EXE).catch(() => null);
  if (exeStat && exeStat.mtimeMs >= srcStat.mtimeMs) return SANDBOX_EXE;

  if (!(await exists(GXX))) {
    throw new Error("找不到 g++：請先執行環境檢查（doctor）安裝工具鏈。");
  }
  await mkdir(path.dirname(SANDBOX_EXE), { recursive: true });
  const r = await run(GXX, ["-std=c++20", "-O2", "-municode", src, "-o", SANDBOX_EXE], {
    cwd: path.dirname(SANDBOX_EXE), tag: "build-sandbox", timeoutMs: 180000,
  });
  if (r.code !== 0) throw new Error(`sandbox 建置失敗：${r.err.slice(0, 400)}`);
  return SANDBOX_EXE;
}

async function runInSandbox(exePath, buildDir, limits, tag, stdinFile = null) {
  const sb = await ensureSandbox();
  const meta = path.join(buildDir, `${tag}.meta.json`);
  const args = [
    "--exe", exePath,
    "--timeout-ms", String(limits.timeoutMs),
    "--mem-mb", String(limits.memMb),
    "--procs", String(limits.procs),
    "--out-cap", String(limits.outCap),
    "--out", path.join(buildDir, `${tag}.stdout.txt`),
    "--err", path.join(buildDir, `${tag}.stderr.txt`),
    "--json", meta,
  ];
  if (stdinFile) args.push("--stdin", stdinFile);

  await run(sb, args, { cwd: buildDir, tag: `sb-${tag}`, timeoutMs: limits.timeoutMs + 30000 });

  const m = await readFile(meta, "utf8").then(JSON.parse).catch(() => ({
    exitCode: -1, timedOut: true, elapsedMs: limits.timeoutMs, peakMemoryBytes: 0,
  }));
  m.stdout = await readFile(path.join(buildDir, `${tag}.stdout.txt`), "utf8").catch(() => "");
  m.stderr = await readFile(path.join(buildDir, `${tag}.stderr.txt`), "utf8").catch(() => "");
  return m;
}

// ── 單一 grader ─────────────────────────────────────────────────────

const makeCheck = (id, label, blocking = true) => ({
  id, label, status: "skip", detail: "", messages: [], durationMs: 0, blocking,
});

async function gradeCompile(ctx) {
  const c = makeCheck("compile", "編譯（警告即錯誤）");
  const t0 = Date.now();
  // 標頭檔提交不能單獨編譯成 TU，改用「只 include 它」的探針
  const src = ctx.isHeader ? ctx.probeSrc : ctx.submission;
  const r = await run(GXX, [
    `-std=${ctx.std}`, ...ctx.flags, "-fdiagnostics-plain-output",
    "-I", ctx.includeDir, "-c", src, "-o", path.join(ctx.buildDir, "submission.o"),
  ], { cwd: ctx.buildDir, tag: "compile" });
  c.durationMs = Date.now() - t0;
  c.status = r.code === 0 ? "pass" : "fail";
  c.detail = r.code === 0 ? "無警告、無錯誤" : "編譯失敗";
  c.diagnostics = parseDiagnostics(r.err);
  c.raw = r.err;
  return c;
}

async function gradeUnitTest(ctx) {
  const c = makeCheck("unit_test", "單元測試（隱藏測資）");
  const t0 = Date.now();
  const exe = path.join(ctx.buildDir, "tests.exe");
  // 標頭檔提交已經被 tests.cpp include 進去，不再當成獨立 TU 編譯
  const subInputs = ctx.isHeader ? [] : [ctx.submission];
  const build = await run(GXX, [
    `-std=${ctx.std}`, ...ctx.quietFlags, "-fdiagnostics-plain-output",
    "-I", ctx.includeDir, ctx.testsSrc, ...subInputs, ...ctx.supportSources, "-o", exe,
  ], { cwd: ctx.buildDir, tag: "build-tests" });

  if (build.code !== 0) {
    c.durationMs = Date.now() - t0;
    c.status = "fail";
    c.detail = "測試程式建置失敗";
    c.diagnostics = parseDiagnostics(build.err);
    // 連結錯誤不會有 file:line:col，必須把原始訊息給學員看
    c.messages = extractErrorLines(build.err, ctx.buildDir);
    c.raw = build.err;
    return c;
  }

  const res = await runInSandbox(exe, ctx.buildDir, ctx.limits, "unit_test");
  const m = /TESTS:\s*(\d+) passed,\s*(\d+) failed/.exec(res.stdout || "");
  const passed = m ? Number(m[1]) : 0;
  const failed = m ? Number(m[2]) : 0;
  c.durationMs = Date.now() - t0;
  c.metrics = { passed, failed, elapsedMs: res.elapsedMs, peakMemoryBytes: res.peakMemoryBytes };

  if (res.timedOut) {
    c.status = "fail"; c.detail = `逾時（>${ctx.limits.timeoutMs}ms）`;
  } else if (!m) {
    // 沒有 TESTS 摘要 = 程式在印出結果前就結束了。
    // 「可能崩潰」太模糊，所以給退出碼與最可能的原因（atlas 會再補上對應條目）。
    const code = Number(res.exitCode ?? -1);
    const crashed = (code >>> 0) >= 0xc0000000;
    c.status = "fail";
    if (crashed) {
      c.detail = `執行期崩潰（${res.exitCodeHex ?? "0x" + code.toString(16)}）`
        + "—— 常見於越界寫入、重複釋放（double free）或空指標";
    } else if (code === 86) {
      c.detail = "測試程式提前結束（記憶體檢查器回報問題）";
    } else {
      c.detail = `測試程式沒有產出結果（exit=${code}）—— 是否忘了在 main 呼叫 cf::run_all？`;
    }
    c.messages = extractErrorLines(res.stderr, ctx.buildDir);
  } else if (failed > 0) {
    c.status = "fail"; c.detail = `${passed} 過 / ${failed} 敗`;
    c.messages = extractFailures(res.stdout, ctx.buildDir).slice(0, 6);
  } else if (passed < ctx.minTests) {
    c.status = "fail"; c.detail = `只跑了 ${passed} 個測試，少於要求的 ${ctx.minTests}`;
  } else {
    c.status = "pass"; c.detail = `${passed}/${passed} 測試通過（${res.elapsedMs}ms）`;
    c.messages = (res.stdout || "").split(/\r?\n/).filter((l) => /^\[ ok \]/.test(l)).slice(0, 12);
  }
  c.raw = res.stderr;
  return c;
}

async function gradeIoMatch(ctx) {
  const c = makeCheck("io_match", "輸出比對（stdin → stdout）");
  const t0 = Date.now();
  if (ctx.isHeader) {
    c.status = "skip"; c.blocking = false;
    c.detail = "標頭檔提交沒有 main，不使用輸出比對";
    return c;
  }
  const exe = path.join(ctx.buildDir, "program.exe");
  const build = await run(GXX, [
    `-std=${ctx.std}`, ...ctx.flags, "-fdiagnostics-plain-output",
    ctx.submission, ...ctx.supportSources, "-o", exe,
  ], { cwd: ctx.buildDir, tag: "build-io" });

  if (build.code !== 0) {
    c.durationMs = Date.now() - t0;
    c.status = "fail"; c.detail = "編譯失敗";
    c.diagnostics = parseDiagnostics(build.err);
    c.raw = build.err;
    return c;
  }

  const results = [];
  for (const [i, cs] of ctx.ioCases.entries()) {
    const stdinFile = path.join(ctx.buildDir, `io-${i}.stdin.txt`);
    await writeFile(stdinFile, cs.stdin ?? "", "utf8");
    const res = await runInSandbox(exe, ctx.buildDir, ctx.limits, `io-${i}`, stdinFile);
    const got = normalizeOutput(res.stdout);
    // 內容檔可以用 expect（既有節點）或 stdout（比較直覺）表示期望輸出
    const want = normalizeOutput(cs.expect ?? cs.stdout ?? "");
    const ok = !res.timedOut && res.exitCode === 0 && got === want;
    results.push({ name: cs.name ?? `案例 ${i + 1}`, ok, got, want, timedOut: res.timedOut, exitCode: res.exitCode });
  }

  c.durationMs = Date.now() - t0;
  const failed = results.filter((r) => !r.ok);
  c.status = failed.length === 0 ? "pass" : "fail";
  c.detail = failed.length === 0
    ? `${results.length}/${results.length} 組輸入輸出相符`
    : `${results.length - failed.length} 過 / ${failed.length} 敗`;
  // 讓 bugCount 檢查也能用在只有 io_match 的節點上（把每組測資當成一個測試）
  c.metrics = { passed: results.length - failed.length, failed: failed.length };
  c.messages = failed.slice(0, 4).map((f) =>
    `${f.name}：預期「${oneLine(f.want)}」，得到「${oneLine(f.got)}」${f.timedOut ? "（逾時）" : ""}`);
  c.cases = results;
  return c;
}

const normalizeOutput = (s) =>
  String(s ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "");

const oneLine = (s) => String(s).replace(/\n/g, "⏎").slice(0, 60);

async function gradeRuntimeSafety(ctx) {
  const c = makeCheck("runtime_safety", "記憶體安全（洩漏 + 邊界檢查）");
  const t0 = Date.now();
  const exe = path.join(ctx.buildDir, "tests-safe.exe");
  const harness = path.join(ctx.includeDir, "leak_check.cpp");
  const build = await run(GXX, [
    `-std=${ctx.std}`, "-g", "-O0", "-fdiagnostics-plain-output",
    "-D_GLIBCXX_DEBUG", "-D_GLIBCXX_ASSERTIONS",
    "-I", ctx.includeDir, ctx.testsSrc, ...(ctx.isHeader ? [] : [ctx.submission]),
    ...ctx.supportSources, harness, "-o", exe,
  ], { cwd: ctx.buildDir, tag: "build-safe", timeoutMs: 120000 });

  if (build.code !== 0) {
    c.durationMs = Date.now() - t0;
    c.status = "skip"; c.blocking = false;
    c.detail = "無法建置檢查版本（略過）";
    return c;
  }

  const res = await runInSandbox(exe, ctx.buildDir, ctx.limits, "runtime_safety");
  c.durationMs = Date.now() - t0;
  const leakMatch = /LEAKCHECK: (\d+) leaked block/.exec(res.stderr || "");
  const leaks = leakMatch ? Number(leakMatch[1]) : 0;
  const dfMatch = /LEAKCHECK: (\d+) double free/.exec(res.stderr || "");
  const doubleFrees = dfMatch ? Number(dfMatch[1]) : 0;
  const code = Number(res.exitCode ?? -1);
  const crashed = (code >>> 0) >= 0xc0000000;
  const testSummary = /TESTS:\s*\d+ passed,\s*(\d+) failed/.exec(res.stdout || "");
  const testFailures = testSummary ? Number(testSummary[1]) : null;

  if (res.timedOut) { c.status = "fail"; c.detail = `逾時（>${ctx.limits.timeoutMs}ms）`; }
  else if (doubleFrees > 0) { c.status = "fail"; c.detail = `重複釋放（double free）${doubleFrees} 次`; }
  else if (leaks > 0) { c.status = "fail"; c.detail = `記憶體洩漏 ${leaks} 塊`; }
  else if (code === 86) { c.status = "fail"; c.detail = "記憶體檢查失敗（檢查器以 86 結束）"; }
  else if (crashed) { c.status = "fail"; c.detail = `執行期崩潰（${res.exitCodeHex ?? "0x" + code.toString(16)}）`; }
  else if (testFailures !== null && testFailures > 0) {
    c.status = "fail"; c.detail = `測試本身有 ${testFailures} 項未通過，安全檢查無定論`;
  } else if (code !== 0) { c.status = "fail"; c.detail = `非預期結束（exit=${code}）`; }
  else { c.status = "pass"; c.detail = "無洩漏、無重複釋放、無越界、無崩潰"; }
  c.raw = res.stderr || "";
  return c;
}

// 靜態分析：GCC 的 -fanalyzer 會做跨函式的路徑分析，
// 抓得到「空指標解參考」「記憶體洩漏」「有號整數溢位」「使用未初始化值」等。
// 注意：-fanalyzer 只產生 warning，編譯仍然成功，所以必須獨立成一個 grader。
async function gradeAnalyzer(ctx) {
  const c = makeCheck("analyzer", "靜態分析（-fanalyzer）");
  const t0 = Date.now();
  const src = ctx.isHeader ? ctx.probeSrc : ctx.submission;
  const obj = path.join(ctx.buildDir, "analyzer.o");
  const r = await run(GXX, [
    `-std=${ctx.std}`, "-fanalyzer", "-Wall", "-Wextra", "-fdiagnostics-plain-output",
    "-I", ctx.includeDir, "-c", src, "-o", obj,
  ], { cwd: ctx.buildDir, tag: "analyzer", timeoutMs: 180000 });

  c.durationMs = Date.now() - t0;
  const diags = parseDiagnostics(r.err);

  if (r.code !== 0) {
    c.status = "fail";
    c.detail = "分析時編譯失敗";
    c.diagnostics = diags;
    c.raw = r.err;
    return c;
  }

  // 只看提交檔（以及標頭提交的探針）裡的問題；系統標頭的警告不算學員的
  const own = diags.filter((d) => /submission|probe/.test(d.file ?? ""));
  const warnings = own.filter((d) => d.severity === "warning");
  const errors = own.filter((d) => d.severity === "error");

  if (errors.length > 0) {
    c.status = "fail";
    c.detail = `分析器回報 ${errors.length} 個錯誤`;
  } else if (warnings.length > 0) {
    c.status = "fail";
    const first = warnings[0].message.replace(/^\[-W[^\]]+\]\s*/, "");
    c.detail = `分析器發現 ${warnings.length} 個問題：${first.slice(0, 60)}`;
  } else {
    c.status = "pass";
    c.detail = "分析器沒有發現問題";
  }
  c.messages = warnings.slice(0, 6).map((w) => `第 ${w.line} 行：${w.message.replace(/^\[-W[^\]]+\]\s*/, "")}`);
  c.diagnostics = own;
  c.raw = r.err;
  return c;
}

// 靜態規則有兩種：
//   預設            → 禁用寫法（出現就違規）
//   required: true  → 必須寫法（完全沒出現就違規）
// 「必須」的規則用來確認某種機制真的被用了（例如共享計數器要用 std::atomic）。
async function gradeStaticRules(ctx) {
  const c = makeCheck("static_rules", "靜態規則（禁用／必須寫法）");
  const t0 = Date.now();
  const src = ctx.isHeader
    ? await readFile(path.join(ctx.includeDir, ctx.submissionName), "utf8").catch(() => "")
    : await readFile(ctx.submission, "utf8");
  const lines = src.split(/\r?\n/);
  const violations = [];
  for (const rule of ctx.staticRules) {
    const re = new RegExp(rule.pattern, "g");
    let hits = 0;
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
      re.lastIndex = 0;
      if (re.test(line)) {
        hits += 1;
        if (!rule.required) {
          violations.push({ rule: rule.id, line: i + 1, message: rule.message, code: trimmed });
        }
      }
    });
    if (rule.required && hits === 0) {
      violations.push({ rule: rule.id, line: 0, message: rule.message, code: "（完全沒有出現）" });
    }
  }
  const requiredCount = ctx.staticRules.filter((r) => r.required).length;
  c.durationMs = Date.now() - t0;
  c.status = violations.length === 0 ? "pass" : "fail";
  c.detail = violations.length === 0
    ? `符合 ${ctx.staticRules.length} 條規則（含 ${requiredCount} 條必須項）`
    : `發現 ${violations.length} 處違規`;
  c.messages = violations.map((v) => (v.line > 0
    ? `第 ${v.line} 行 [${v.rule}] ${v.message}`
    : `[${v.rule}] ${v.message}`));
  c.violations = violations;
  return c;
}

const GRADERS = {
  compile: gradeCompile,
  unit_test: gradeUnitTest,
  io_match: gradeIoMatch,
  runtime_safety: gradeRuntimeSafety,
  static_rules: gradeStaticRules,
  analyzer: gradeAnalyzer,
};

const LABELS = {
  compile: "編譯",
  unit_test: "單元測試",
  io_match: "輸出比對",
  runtime_safety: "記憶體安全",
  static_rules: "靜態規則",
  analyzer: "靜態分析",
};

// ── 對外入口 ────────────────────────────────────────────────────────

/**
 * 評測一次提交。
 * @param {object} node  由 content.scanNodes() 取得的節點（含 dir）
 * @param {string} code  學員提交的 starter.cpp 內容
 */
export async function evaluateNode(node, code) {
  const t0 = Date.now();
  assertAscii(RUNS_DIR, "建置目錄");
  if (!(await exists(GXX))) {
    throw new Error("TOOLCHAIN_MISSING");
  }

  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const buildDir = path.join(RUNS_DIR, `${node.id.replace(/[^\w.-]/g, "_")}-${stamp}`);
  const includeDir = path.join(buildDir, "include");
  await mkdir(includeDir, { recursive: true });

  // 提交可以是 .cpp，也可以是 .hpp（模板的定義必須放在標頭檔，見 L3.04）
  const submissionName = node.submissionName ?? "submission.cpp";
  const isHeader = /\.(hpp|h|hh|hxx)$/i.test(submissionName);

  const submission = path.join(buildDir, submissionName);
  await writeFile(submission, code, "utf8");
  await cp(path.join(LIB_DIR, "cf_test.hpp"), path.join(includeDir, "cf_test.hpp"));
  await cp(path.join(LIB_DIR, "leak_check.cpp"), path.join(includeDir, "leak_check.cpp"));
  if (isHeader) {
    // 標頭檔提交要放進 include 目錄，讓 tests.cpp 能 include 到定義
    await cp(submission, path.join(includeDir, submissionName));
  }

  // 不可修改的介面檔（複製到 include 目錄，測試與提交都 include 它）
  const ifaceDir = path.join(node.dir, "interface");
  if (await exists(ifaceDir)) {
    for (const f of await readdir(ifaceDir)) {
      await cp(path.join(ifaceDir, f), path.join(includeDir, f));
    }
  }

  let testsSrc = null;
  const testsFile = path.join(node.dir, "tests.cpp");
  if (await exists(testsFile)) {
    testsSrc = path.join(buildDir, "tests.cpp");
    await cp(testsFile, testsSrc);
  }

  // 「隊友已經寫好的」支援檔案：不是學員要改的，但必須連結進來
  const supportSources = [];
  for (const rel of node.support ?? []) {
    const src = path.join(node.dir, rel);
    if (!(await exists(src))) throw new Error(`節點 ${node.id} 宣告的 support 檔不存在：${rel}`);
    const dst = path.join(buildDir, path.basename(rel));
    await cp(src, dst);
    supportSources.push(dst);
  }

  const g = node.grader ?? {};
  const limits = { timeoutMs: 5000, memMb: 256, procs: 4, outCap: 65536, ...(g.limits ?? node.limits ?? {}) };

  // 標頭檔提交：編譯檢查改編譯一個只 include 它的探針 TU
  let probeSrc = null;
  if (isHeader) {
    probeSrc = path.join(buildDir, "probe.cpp");
    await writeFile(probeSrc, `#include "${submissionName}"\n\nint main() { return 0; }\n`, "utf8");
  }

  const ctx = {
    buildDir,
    includeDir,
    submission,
    submissionName,
    isHeader,
    probeSrc,
    testsSrc,
    supportSources,
    std: node.std ?? "c++20",
    flags: g.compileFlags ?? node.compileFlags ?? ["-Wall", "-Wextra", "-Wpedantic", "-Werror"],
    quietFlags: ["-Wall", "-Wextra"],
    staticRules: g.staticRules ?? node.staticRules ?? [],
    ioCases: node.io?.cases ?? [],
    minTests: node.minTests ?? g.assertions?.minTests ?? 1,
    limits,
  };

  const wanted = node.graders ?? ["compile", "unit_test"];
  const results = [];

  // 編譯沒過就沒有必要跑後續（除了靜態規則，它不依賴編譯）
  const compile = await gradeCompile(ctx);
  results.push(compile);
  const compiled = compile.status === "pass";

  for (const id of wanted) {
    if (id === "compile") continue;
    if (id === "static_rules") { results.push(await gradeStaticRules(ctx)); continue; }
    if (!compiled) {
      const c = makeCheck(id, LABELS[id] ?? id);
      c.status = "skip"; c.detail = "編譯未通過，略過";
      results.push(c);
      continue;
    }
    if (id === "unit_test" && !testsSrc) {
      const c = makeCheck(id, LABELS[id] ?? id);
      c.status = "skip"; c.blocking = false; c.detail = "這個節點沒有隱藏測試";
      results.push(c);
      continue;
    }
    const fn = GRADERS[id];
    if (!fn) continue;
    results.push(await fn(ctx));
  }

  const blocking = results.filter((r) => r.blocking);
  const passed = blocking.length > 0 && blocking.every((r) => r.status === "pass");
  const diagnostics = results.flatMap((r) => r.diagnostics ?? []);
  const rawErr = results.map((r) => r.raw ?? "").join("\n");

  // 錯誤圖鑑：把「編譯器原文 + 執行期輸出 + 檢查細節」一起拿去比對。
  // 只比對原文會漏掉「逾時」「測試沒有產出結果」這類由評測器產生的訊息。
  const atlasHay = [
    rawErr,
    ...results.map((r) => `${r.detail ?? ""}\n${(r.messages ?? []).join("\n")}`),
  ].join("\n");
  // 通過的提交不給圖鑑：正常輸出難免含有關鍵字，顯示只會造成噪音
  const atlas = passed ? [] : matchAtlas(atlasHay, diagnostics.map((d) => d.message));

  const report = {
    status: "ok",
    nodeId: node.id,
    title: node.title,
    passed,
    score: blocking.length ? blocking.filter((r) => r.status === "pass").length / blocking.length : 0,
    results: results.map(({ raw, ...rest }) => rest),
    diagnostics,
    hints: hintsFor(diagnostics, rawErr),
    atlas,
    timing: { totalMs: Date.now() - t0 },
  };

  await rm(buildDir, { recursive: true, force: true }).catch(() => {});
  return report;
}

export { BUILD_ROOT };
