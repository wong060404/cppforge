// CppForge 產品：環境檢查（doctor）
//
// 把 POC 學到的教訓變成可執行檢查：
//   1. 家目錄必須 ASCII（否則 MinGW 的 ld.exe 直接失敗）
//   2. 工具鏈必須存在，且 g++ 能編譯、gdb 能跑、_GLIBCXX_DEBUG 可用
//   3. 沙箱程式必須能建置（這是執行學員程式的前提）
//   4. Monaco 與資料庫必須就緒（否則 UI 會壞得莫名其妙）

import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  BUILD_ROOT, GXX, HOME, MONACO_DIR, REPO_DIR, SANDBOX_EXE, isAscii,
} from "./config.mjs";
import { ensureSandbox } from "./grading.mjs";

const exists = (p) => stat(p).then(() => true, () => false);
const TMP = path.join(BUILD_ROOT, "doctor");

async function runCapture(exe, args, { cwd = TMP, timeoutMs = 60000, tag = "run" } = {}) {
  await mkdir(TMP, { recursive: true });
  const outF = path.join(TMP, `${tag}.out.txt`);
  const errF = path.join(TMP, `${tag}.err.txt`);
  const o = openSync(outF, "w");
  const e = openSync(errF, "w");
  const code = await new Promise((resolve) => {
    const p = spawn(exe, args, { cwd, stdio: ["ignore", o, e], windowsHide: true });
    const t = setTimeout(() => {
      spawn("taskkill", ["/PID", String(p.pid), "/T", "/F"], { stdio: "ignore" });
      resolve(-99);
    }, timeoutMs);
    p.on("error", () => { clearTimeout(t); resolve(-1); });
    p.on("close", (c) => { clearTimeout(t); resolve(c ?? -1); });
  });
  closeSync(o); closeSync(e);
  return {
    code,
    out: await readFile(outF, "utf8").catch(() => ""),
    err: await readFile(errF, "utf8").catch(() => ""),
  };
}

const check = (id, label, status, detail, hint = null) => ({ id, label, status, detail, hint });

async function canCompile() {
  const src = path.join(TMP, "hello.cpp");
  const exe = path.join(TMP, "hello.exe");
  await mkdir(TMP, { recursive: true });
  await writeFile(src, `#include <cstdio>\nint main(){ std::printf("ok"); }\n`, "utf8");
  const r = await runCapture(GXX, ["-std=c++20", src, "-o", exe], { tag: "hello" });
  return r.code === 0;
}

export async function doctorReport() {
  const checks = [];

  // 1) 家目錄 ASCII
  checks.push(canCompileHome());

  // 2) 工具鏈
  const toolchainOk = await exists(GXX);
  checks.push(check("toolchain", "C++ 工具鏈（g++）", toolchainOk ? "pass" : "fail",
    toolchainOk ? GXX : `找不到 ${GXX}`,
    toolchainOk ? null : "按「安裝工具鏈」下載 w64devkit（免安裝、可離線）"));

  if (toolchainOk) {
    const v = await runCapture(GXX, ["--version"], { tag: "gxx" });
    const ver = (v.out.split(/\r?\n/)[0] || "").trim();
    checks.push(check("gxx-version", "g++ 版本", v.code === 0 ? "pass" : "fail", ver || "無法取得"));

    const compiled = await canCompile();
    checks.push(check("compile", "能編譯並連結", compiled ? "pass" : "fail",
      compiled ? "hello world 編譯成功" : "編譯或連結失敗",
      compiled ? null : "檢查是否有防毒軟體攔截，或磁碟空間不足"));

    const gdb = await runCapture(GXX.replace(/g\+\+\.exe$/i, "gdb.exe"), ["--version"], { tag: "gdb" });
    checks.push(check("gdb", "除錯器（gdb）", gdb.code === 0 ? "pass" : "warn",
      (gdb.out.split(/\r?\n/)[0] || "").trim() || "找不到 gdb",
      gdb.code === 0 ? null : "沒有 gdb 時「除錯」單元會少一些功能"));
  } else {
    checks.push(check("gxx-version", "g++ 版本", "skip", "工具鏈未安裝"));
    checks.push(check("compile", "能編譯並連結", "skip", "工具鏈未安裝"));
    checks.push(check("gdb", "除錯器（gdb）", "skip", "工具鏈未安裝"));
  }

  // 3) 沙箱
  let sandboxOk = false;
  let sandboxDetail = "";
  try {
    const exe = await ensureSandbox();
    sandboxOk = await exists(exe);
    sandboxDetail = sandboxOk ? exe : "建置後找不到執行檔";
  } catch (err) {
    sandboxDetail = String(err.message ?? err).slice(0, 200);
  }
  checks.push(check("sandbox", "沙箱監管程式", sandboxOk ? "pass" : "fail", sandboxDetail,
    sandboxOk ? null : "沙箱無法建置時，無法安全執行學員程式"));

  // 4) Monaco（UI 編輯器）
  const monacoPath = path.join(MONACO_DIR, "vs", "loader.js");
  const monacoOk = await exists(monacoPath);
  checks.push(check("monaco", "程式編輯器（Monaco）", monacoOk ? "pass" : "warn",
    monacoOk ? monacoPath : "找不到 Monaco，UI 會退回純文字編輯器",
    monacoOk ? null : "在 app/ 下執行 npm install monaco-editor"));

  // 5) 資料庫
  let dbOk = false;
  try {
    const { stats } = await import("./db.mjs");
    dbOk = typeof stats() === "object";
  } catch (err) {
    void err;
  }
  checks.push(check("database", "進度資料庫（node:sqlite）", dbOk ? "pass" : "fail",
    dbOk ? path.join(HOME, "cppforge.db") : "無法開啟資料庫"));

  const failed = checks.filter((c) => c.status === "fail").length;
  return {
    checks,
    ready: failed === 0,
    failed,
    home: HOME,
    repo: REPO_DIR,
  };
}

function canCompileHome() {
  const ok = isAscii(HOME);
  return check("home-ascii", "安裝路徑為純 ASCII", ok ? "pass" : "fail", HOME,
    ok ? null : "MinGW 的 ld.exe 無法處理非 ASCII 路徑：請把 CPPFORGE_HOME 指到純英文路徑（例如 C:\\CppForge）");
}

/** 下載並安裝工具鏈（呼叫 POC 已驗證過的腳本，避免兩份實作） */
export async function installToolchain() {
  const script = path.join(REPO_DIR, "poc", "tools", "fetch-toolchain.mjs");
  const r = await runCapture(process.execPath, [script], { timeoutMs: 600000, tag: "install" });
  return {
    ok: r.code === 0,
    exitCode: r.code,
    log: (r.out + r.err).split(/\r?\n/).filter(Boolean).slice(-20).join("\n"),
  };
}

export { SANDBOX_EXE };
