#!/usr/bin/env node
// CppForge POC: 評測器（runner）
//
// 這是整個產品的技術心臟：把一份提交變成一份結構化評測結果。
// 刻意模仿 Exercism 的 test-runner 契約（stdin/stdout JSON），
// 讓同一份 UI 未來可以接本機沙箱、Docker、或遠端 judge。
//
// 用法：
//   node run.mjs --exercise ../../fixtures/L2-raii-file-guard --variant solution
//   node run.mjs --exercise ... --ci        # 內容 CI：驗證 參考解/起始碼/違規碼 三種行為
//
// 輸出：poc/reports/<exercise>-<variant>.json + 人可讀的終端摘要

import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { BUILD_ROOT, GXX } from "../../lib/paths.mjs";

const POC = path.resolve(import.meta.dirname, "..");
const LIB = path.resolve(POC, "..", "lib");
const SANDBOX = path.join(BUILD_ROOT, "bin", "sandbox.exe");
const REPORTS = path.join(POC, "reports");

// ── 工具 ────────────────────────────────────────────────────────────

let seq = 0;
const nextId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** 執行外部程式，輸出重定向到檔案（沙箱下不可用 pipe）。 */
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

const exists = (p) => stat(p).then(() => true, () => false);

/** 把建置目錄的絕對路徑從訊息裡抹掉（學員不該看到暫存路徑）。 */
const scrub = (s, buildDir) =>
  String(s ?? "")
    .split(buildDir + "\\").join("")
    .split(buildDir + "/").join("")
    .split(buildDir).join("");

/** 從測試輸出萃取失敗清單：[FAIL] 名稱 + 縮排的細節。 */
function extractFailures(stdout, buildDir) {
  const lines = String(stdout ?? "").split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; ++i) {
    const m = /^\[FAIL\]\s+(.*)$/.exec(lines[i]);
    if (!m) continue;
    const details = [];
    while (i + 1 < lines.length && /^\s{4,}\S/.test(lines[i + 1])) {
      details.push(lines[++i].trim());
    }
    out.push(details.length ? `${m[1]} — ${details.join("；")}` : m[1]);
  }
  return out.map((s) => scrub(s, buildDir));
}

// ── 診斷解析與教學提示（「錯誤圖鑑」的最小原型）─────────────────────

const DIAG_RE = /^(.*?):(\d+):(\d+):\s*(fatal error|error|warning|note):\s*(.*)$/;

const HINTS = [
  { match: /undefined reference to/i,
    hint: "連結錯誤：有宣告（header）但沒有定義（definition）。檢查是否漏了 .cpp 檔、函式簽章是否一致、是否忘了 inline/static。" },
  { match: /multiple definition of/i,
    hint: "同一個符號被定義兩次：通常是「在 header 裡定義了非 inline 函式或全域變數」。請加 inline 或搬到 .cpp。" },
  { match: /no matching function for call/i,
    hint: "找不到可用的多載：多半是參數型別或 const 不一致（例如傳 const 物件給非 const 參考）。" },
  { match: /was not declared in this scope/i,
    hint: "名稱不在這個作用域：檢查拼字、是否漏 include、是否忘了 std:: 或自訂 namespace。" },
  { match: /expected [';']/i,
    hint: "語法錯誤：通常是前一行漏了分號，或是括號沒配對。" },
  { match: /cannot convert/i,
    hint: "型別轉換失敗：檢查 explicit 建構子、是否有隱式轉換被禁止、或該用 static_cast。" },
  { match: /redefinition of/i,
    hint: "同一作用域重複定義：檢查是否有兩份相同宣告，或 header 缺少 include guard。" },
  { match: /control reaches end of non-void function/i,
    hint: "函式有回傳值但某條路徑沒有 return —— 這是未定義行為，不是警告而已。" },
  { match: /unused (variable|parameter)/i,
    hint: "未使用的變數/參數：可用 [[maybe_unused]] 表達意圖，或直接刪掉。C++ 職場通常把警告當錯。" },
  { match: /nullptr|NULL/i,
    hint: "空指標相關：解參考前先檢查，優先使用 nullptr 而非 NULL/0。" },
];

const RUNTIME_HINTS = [
  { match: /LEAKCHECK: \d+ leaked/,
    hint: "記憶體洩漏：有 new 沒有對應的 delete。練習目標是讓 RAII 物件替你管理，不要手動 delete。" },
  { match: /attempt to subscript container with out-of-bounds|_GLIBCXX_DEBUG|Assertion/i,
    hint: "標準庫邊界檢查抓到越界：索引超出 size()，或迭代器已失效（例如對 vector push_back 後繼續用舊迭代器）。" },
  { match: /stack buffer overrun|STATUS_STACK_BUFFER_OVERRUN/i,
    hint: "堆疊溢位：寫入超過陣列大小，這是最危險的一類記憶體錯誤。" },
];

function parseDiagnostics(stderr) {
  const out = [];
  for (const line of (stderr || "").split(/\r?\n/)) {
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
  const found = [];
  const hay = [stderr || "", ...diagnostics.map((d) => d.message)].join("\n");
  for (const h of [...HINTS, ...RUNTIME_HINTS]) {
    if (h.match.test(hay) && !found.includes(h.hint)) found.push(h.hint);
  }
  return found.slice(0, 4);
}

// ── 沙箱執行 ────────────────────────────────────────────────────────

async function ensureSandbox() {
  if (await exists(SANDBOX)) return SANDBOX;
  await mkdir(path.dirname(SANDBOX), { recursive: true });
  const src = path.join(LIB, "sandbox.cpp");
  const r = await run(GXX, ["-std=c++20", "-O2", "-municode", src, "-o", SANDBOX], {
    cwd: path.dirname(SANDBOX), tag: "build-sandbox", timeoutMs: 180000,
  });
  if (r.code !== 0) throw new Error(`sandbox 建置失敗：${r.err.slice(0, 400)}`);
  return SANDBOX;
}

async function runInSandbox(exePath, buildDir, limits, tag) {
  const sb = await ensureSandbox();
  const meta = path.join(buildDir, `${tag}.meta.json`);
  await run(sb, [
    "--exe", exePath,
    "--timeout-ms", String(limits.timeoutMs),
    "--mem-mb", String(limits.memMb),
    "--procs", String(limits.procs),
    "--out-cap", String(limits.outCap),
    "--out", path.join(buildDir, `${tag}.stdout.txt`),
    "--err", path.join(buildDir, `${tag}.stderr.txt`),
    "--json", meta,
  ], { cwd: buildDir, tag: `sb-${tag}`, timeoutMs: limits.timeoutMs + 30000 });

  const m = await readFile(meta, "utf8").then(JSON.parse).catch(() => ({
    exitCode: -1, timedOut: true, elapsedMs: limits.timeoutMs, peakMemoryBytes: 0,
  }));
  m.stdout = await readFile(path.join(buildDir, `${tag}.stdout.txt`), "utf8").catch(() => "");
  m.stderr = await readFile(path.join(buildDir, `${tag}.stderr.txt`), "utf8").catch(() => "");
  return m;
}

// ── Grader 實作 ─────────────────────────────────────────────────────

const makeCheck = (id, label) => ({ id, label, status: "skip", detail: "", messages: [], durationMs: 0, blocking: true });

async function gradeCompile(ctx) {
  const c = makeCheck("compile", "編譯（-Wall -Wextra -Werror）");
  const t0 = Date.now();
  const r = await run(GXX, [
    `-std=${ctx.std}`, ...ctx.flags, "-fdiagnostics-plain-output",
    "-I", ctx.includeDir, "-c", ctx.submission, "-o", path.join(ctx.buildDir, "submission.o"),
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
  const build = await run(GXX, [
    `-std=${ctx.std}`, ...ctx.flags.filter((f) => !f.startsWith("-W")), "-fdiagnostics-plain-output",
    "-I", ctx.includeDir, ctx.testsSrc, ctx.submission, "-o", exe,
  ], { cwd: ctx.buildDir, tag: "build-tests" });

  if (build.code !== 0) {
    c.durationMs = Date.now() - t0;
    c.status = "fail";
    c.detail = "測試程式建置失敗";
    c.diagnostics = parseDiagnostics(build.err);
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
    c.status = "fail";
    c.detail = `逾時（>${ctx.limits.timeoutMs}ms）`;
  } else if (!m) {
    c.status = "fail";
    c.detail = "測試程式沒有產出結果（可能崩潰或未呼叫 cf::run_all）";
  } else if (failed > 0) {
    c.status = "fail";
    c.detail = `${passed} 過 / ${failed} 敗（需 ${ctx.minTests} 個測試全過）`;
    c.messages = extractFailures(res.stdout, ctx.buildDir).slice(0, 6);
  } else if (passed < ctx.minTests) {
    c.status = "fail";
    c.detail = `只跑了 ${passed} 個測試，少於要求的 ${ctx.minTests}`;
  } else {
    c.status = "pass";
    c.detail = `${passed}/${passed} 測試通過（${res.elapsedMs}ms）`;
    c.messages = (res.stdout || "").split(/\r?\n/).filter((l) => /^\[ ok \]/.test(l));
  }
  c.raw = res.stderr;
  return c;
}

async function gradeRuntimeSafety(ctx) {
  const c = makeCheck("runtime_safety", "記憶體安全（洩漏 + 標準庫邊界檢查）");
  const t0 = Date.now();
  const exe = path.join(ctx.buildDir, "tests-safe.exe");
  const harness = path.join(ctx.includeDir, "leak_check.cpp");
  const build = await run(GXX, [
    `-std=${ctx.std}`, "-g", "-O0", "-fdiagnostics-plain-output",
    "-D_GLIBCXX_DEBUG", "-D_GLIBCXX_ASSERTIONS",
    "-I", ctx.includeDir, ctx.testsSrc, ctx.submission, harness, "-o", exe,
  ], { cwd: ctx.buildDir, tag: "build-safe", timeoutMs: 120000 });

  if (build.code !== 0) {
    c.durationMs = Date.now() - t0;
    c.status = "skip";
    c.detail = "無法建置檢查版本（略過）";
    c.blocking = false;
    return c;
  }

  const res = await runInSandbox(exe, ctx.buildDir, ctx.limits, "runtime_safety");
  c.durationMs = Date.now() - t0;
  const leakMatch = /LEAKCHECK: (\d+) leaked block/.exec(res.stderr || "");
  const leaks = leakMatch ? Number(leakMatch[1]) : 0;
  const code = Number(res.exitCode ?? -1);
  const isNtStatusError = (code >>> 0) >= 0xc0000000; // 崩潰會回 NTSTATUS 異常碼
  const testSummary = /TESTS:\s*\d+ passed,\s*(\d+) failed/.exec(res.stdout || "");
  const testFailures = testSummary ? Number(testSummary[1]) : null;

  if (res.timedOut) {
    c.status = "fail"; c.detail = `逾時（>${ctx.limits.timeoutMs}ms）`;
  } else if (leaks > 0) {
    c.status = "fail"; c.detail = `記憶體洩漏 ${leaks} 塊`;
  } else if (code === 86) {
    c.status = "fail"; c.detail = "記憶體洩漏（檢查器以 86 結束）";
  } else if (isNtStatusError) {
    c.status = "fail"; c.detail = `執行期崩潰（${res.exitCodeHex ?? "0x" + code.toString(16)}）`;
  } else if (testFailures !== null && testFailures > 0) {
    c.status = "fail"; c.detail = `測試本身有 ${testFailures} 項未通過，安全檢查無定論`;
  } else if (code !== 0) {
    c.status = "fail"; c.detail = `非預期結束（exit=${code}）`;
  } else {
    c.status = "pass"; c.detail = "無洩漏、無越界、無崩潰";
  }
  c.raw = res.stderr || "";
  return c;
}

async function gradeStaticRules(ctx) {
  const c = makeCheck("static_rules", "靜態規則（禁用寫法）");
  const t0 = Date.now();
  const src = await readFile(ctx.submission, "utf8");
  const lines = src.split(/\r?\n/);
  const violations = [];
  for (const rule of ctx.staticRules) {
    const re = new RegExp(rule.pattern, "g");
    lines.forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return; // 略過註解行
      re.lastIndex = 0;
      if (re.test(line)) violations.push({ rule: rule.id, line: i + 1, message: rule.message, code: line.trim() });
    });
  }
  c.durationMs = Date.now() - t0;
  c.status = violations.length === 0 ? "pass" : "fail";
  c.detail = violations.length === 0 ? `符合 ${ctx.staticRules.length} 條規則` : `發現 ${violations.length} 處違規`;
  c.messages = violations.map((v) => `第 ${v.line} 行 [${v.rule}] ${v.message}`);
  c.violations = violations;
  return c;
}

async function gradeAnalyzer(ctx) {
  const c = makeCheck("analyzer", "GCC 靜態分析（-fanalyzer，非阻塞）");
  c.blocking = false;
  const t0 = Date.now();
  const r = await run(GXX, [
    `-std=${ctx.std}`, "-fanalyzer", "-fdiagnostics-plain-output", "-c",
    "-I", ctx.includeDir, ctx.submission, "-o", path.join(ctx.buildDir, "analyzer.o"),
  ], { cwd: ctx.buildDir, tag: "analyzer", timeoutMs: 120000 });
  c.durationMs = Date.now() - t0;
  const diags = parseDiagnostics(r.err).filter((d) => d.severity === "warning" || d.severity === "error");
  const leaks = (r.err || "").match(/\[-Wanalyzer-[a-z-]+\]/g) || [];
  const unique = [...new Set(leaks)];
  c.status = unique.length === 0 ? "pass" : "warn";
  c.detail = unique.length === 0 ? "無分析器警告" : `發現 ${unique.length} 類問題：${unique.join(", ")}`;
  c.diagnostics = diags;
  c.raw = r.err;
  return c;
}

// ── 主流程 ──────────────────────────────────────────────────────────

async function loadExercise(dir) {
  const manifest = JSON.parse(await readFile(path.join(dir, "exercise.json"), "utf8"));
  return { dir, manifest };
}

async function prepare(exercise, variant) {
  const { dir, manifest } = exercise;
  const rel = variant.startsWith(".") || variant.includes("/") || variant.includes("\\")
    ? variant
    : manifest.submission[variant];
  if (!rel) throw new Error(`未知的 variant: ${variant}`);
  const submissionSrc = path.join(dir, rel);
  if (!(await exists(submissionSrc))) throw new Error(`找不到提交檔：${submissionSrc}`);

  const buildDir = path.join(BUILD_ROOT, "submissions", `${manifest.id}-${variant}-${nextId()}`);
  const includeDir = path.join(buildDir, "include");
  await mkdir(includeDir, { recursive: true });

  await cp(path.join(dir, manifest.tests), path.join(buildDir, "tests.cpp"));
  for (const iface of manifest.interface ?? []) {
    await cp(path.join(dir, iface), path.join(includeDir, path.basename(iface)));
  }
  await cp(path.join(LIB, "cf_test.hpp"), path.join(includeDir, "cf_test.hpp"));
  await cp(path.join(LIB, "leak_check.cpp"), path.join(includeDir, "leak_check.cpp"));
  await cp(submissionSrc, path.join(buildDir, "submission.cpp"));

  const g = manifest.grader ?? {};
  return {
    buildDir,
    includeDir,
    submission: path.join(buildDir, "submission.cpp"),
    testsSrc: path.join(buildDir, "tests.cpp"),
    std: manifest.std ?? "c++20",
    flags: g.compileFlags ?? ["-Wall", "-Wextra", "-Werror"],
    staticRules: g.staticRules ?? [],
    minTests: g.assertions?.minTests ?? 1,
    limits: { timeoutMs: 5000, memMb: 256, procs: 4, outCap: 65536, ...(g.limits ?? {}) },
    manifest,
    variant,
  };
}

async function evaluate(exercise, variant, { keep = false } = {}) {
  const t0 = Date.now();
  const ctx = await prepare(exercise, variant);

  const compile = await gradeCompile(ctx);
  const results = [compile];

  if (compile.status === "pass") {
    results.push(await gradeUnitTest(ctx));
    results.push(await gradeRuntimeSafety(ctx));
    results.push(await gradeStaticRules(ctx));
    results.push(await gradeAnalyzer(ctx));
  } else {
    for (const id of ["unit_test", "runtime_safety", "static_rules", "analyzer"]) {
      const label = { unit_test: "單元測試", runtime_safety: "記憶體安全", static_rules: "靜態規則", analyzer: "靜態分析" }[id];
      const c = makeCheck(id, label);
      c.status = "skip";
      c.detail = "編譯未通過，略過";
      c.blocking = id !== "analyzer";
      results.push(c);
    }
  }

  const blocking = results.filter((r) => r.blocking);
  const passed = blocking.every((r) => r.status === "pass");
  const diagnostics = results.flatMap((r) => r.diagnostics ?? []);
  const rawErr = results.map((r) => r.raw ?? "").join("\n");
  const hints = hintsFor(diagnostics, rawErr);

  const report = {
    status: "ok",
    exercise: ctx.manifest.id,
    title: ctx.manifest.title,
    variant,
    passed,
    score: blocking.length ? blocking.filter((r) => r.status === "pass").length / blocking.length : 0,
    results: results.map(({ raw, ...rest }) => rest),
    diagnostics,
    hints,
    timing: { totalMs: Date.now() - t0 },
  };

  if (!keep) await rm(ctx.buildDir, { recursive: true, force: true });
  return report;
}

// ── 內容 CI：三種變體的行為都要符合預期 ─────────────────────────────

async function contentCI(exercise) {
  const checks = [];
  const expect = async (variant, pred, description) => {
    const r = await evaluate(exercise, variant);
    const ok = pred(r);
    checks.push({ variant, description, ok, passed: r.passed, detail: r.results.map((x) => `${x.id}=${x.status}`).join(" ") });
    return r;
  };

  await expect("reference", (r) => r.passed === true,
    "參考解必須全數通過（否則題目本身有問題）");
  await expect("starter", (r) => r.results.find((x) => x.id === "compile").status === "pass" && r.passed === false,
    "起始碼必須「編譯過但測試失敗」（否則學員一開局就卡死）");
  const v = await expect("violation", (r) => r.results.find((x) => x.id === "static_rules").status === "fail",
    "違規碼必須被靜態規則擋下（否則評測器形同虛設）");
  await expect("violation", (r) => r.results.find((x) => x.id === "runtime_safety").status === "fail",
    "違規碼的記憶體洩漏必須被抓到");

  return { checks, violationHints: v.hints };
}

// ── CLI ─────────────────────────────────────────────────────────────

function parseArgv(argv) {
  const o = { exercise: null, variant: "starter", ci: false, json: null, keep: false };
  for (let i = 2; i < argv.length; ++i) {
    const a = argv[i];
    if (a === "--exercise") o.exercise = argv[++i];
    else if (a === "--variant") o.variant = argv[++i];
    else if (a === "--ci") o.ci = true;
    else if (a === "--json") o.json = argv[++i];
    else if (a === "--keep") o.keep = true;
  }
  return o;
}

const MARK = { pass: "PASS", fail: "FAIL", skip: "SKIP", warn: "WARN" };

function printReport(r) {
  console.log(`\n${r.exercise}  [${r.variant}]  ${r.passed ? "✅ 通過" : "❌ 未通過"}  (${r.timing.totalMs}ms)`);
  for (const x of r.results) {
    console.log(`  ${MARK[x.status] ?? "?"}  ${x.id.padEnd(15)} ${x.detail}`);
    for (const m of x.messages ?? []) console.log(`         · ${m}`);
  }
  if (r.hints.length) {
    console.log("\n  💡 教學提示：");
    for (const h of r.hints) console.log(`     - ${h}`);
  }
  if (r.diagnostics.length) {
    console.log("\n  診斷：");
    for (const d of r.diagnostics.slice(0, 5)) {
      console.log(`     ${d.file}:${d.line}:${d.column}  ${d.severity}: ${d.message.slice(0, 90)}`);
    }
  }
}

async function main() {
  const args = parseArgv(process.argv);
  if (!args.exercise) {
    console.error("用法：node run.mjs --exercise <dir> [--variant starter|reference|violation] [--ci]");
    process.exit(2);
  }
  const dir = path.resolve(process.cwd(), args.exercise);
  const exercise = await loadExercise(dir);
  await mkdir(REPORTS, { recursive: true });

  if (args.ci) {
    const { checks } = await contentCI(exercise);
    console.log("\n內容 CI（每個題目都必須通過這四條規則）");
    for (const c of checks) console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.description}\n         ${c.detail}`);
    const ok = checks.every((c) => c.ok);
    console.log(`\n內容 CI：${ok ? "全部通過" : "有規則失敗"}`);
    await writeFile(path.join(REPORTS, "content-ci.json"), JSON.stringify({ exercise: exercise.manifest.id, checks }, null, 2), "utf8");
    process.exit(ok ? 0 : 1);
  }

  const report = await evaluate(exercise, args.variant, { keep: args.keep });
  printReport(report);
  const out = args.json ?? path.join(REPORTS, `${report.exercise}-${report.variant}.json`);
  await writeFile(out, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n報告 → ${out}`);
  process.exit(report.passed ? 0 : 1);
}

await main();
