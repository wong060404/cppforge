#!/usr/bin/env node
// CppForge POC: 沙箱對抗測試
//
// 目的：證明「學員寫壞程式」既不會毀掉使用者機器，也不會鎖死評測服務。
// 六個情境：正常程式 / 無窮迴圈 / 記憶體炸彈 / 輸出洪水 / 孤兒行程 / 行程爆量。
//
// 用法：node sandbox-tests.mjs

import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { BUILD_ROOT, GXX } from "../../lib/paths.mjs";

const BUILD = path.join(BUILD_ROOT, "sandbox-tests");
const SANDBOX = path.join(BUILD_ROOT, "bin", "sandbox.exe");
const OUT_JSON = path.join(path.resolve(import.meta.dirname, ".."), "reports", "sandbox-tests.json");
const TASKLIST = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tasklist.exe");

const MEM_MB = 256;
const TIMEOUT_MS = 3000;
const PROCS = 4;
const OUT_CAP = 1024 * 1024;

/** 執行外部程式，輸出重定向到檔案（沙箱下不可用 pipe）。 */
function runToFile(exe, args, tag, { cwd = BUILD, watchdogMs = 120000 } = {}) {
  const outF = path.join(BUILD, `${tag}.stdout.txt`);
  const errF = path.join(BUILD, `${tag}.stderr.txt`);
  const o = openSync(outF, "w");
  const e = openSync(errF, "w");
  return new Promise((resolve) => {
    const p = spawn(exe, args, { cwd, stdio: ["ignore", o, e], windowsHide: true });
    const t = setTimeout(() => {
      spawn("taskkill", ["/PID", String(p.pid), "/T", "/F"], { stdio: "ignore" });
    }, watchdogMs);
    p.on("error", () => { clearTimeout(t); resolve({ code: -1, out: "", err: "" }); });
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

const sizeOf = async (f) => (await stat(f).catch(() => ({ size: 0 }))).size;

const aliveSleepers = async () => {
  const r = await runToFile(TASKLIST, ["/FI", "IMAGENAME eq sleeper.exe", "/NH"], "tasklist");
  return /sleeper\.exe/i.test(r.out);
};

const SPAWN = `#include <process.h>
static void spawn_sleeper() { _spawnl(_P_NOWAIT, "sleeper.exe", "sleeper.exe", (char*)nullptr); }`;

const PROGRAMS = [
  {
    id: "normal",
    what: "正常程式（控制組）",
    src: `#include <cstdio>
#include <vector>
int main(){ std::vector<int> v(1000, 7); long long s=0; for(int x:v) s+=x; printf("ok %lld\\n", s); }`,
    expect: (r) => r.exitCode === 0 && !r.timedOut,
    describe: (r) => `exit=0, 峰值 ${(r.peakMemoryBytes / 1048576).toFixed(0)}MB`,
  },
  {
    id: "cpu-loop",
    what: "無窮迴圈（CPU 燒機）",
    src: `int main(){ volatile unsigned long long x=0; for(;;){ x++; } }`,
    expect: (r) => r.timedOut === true,
    describe: (r) => `timedOut=${r.timedOut}, ${r.elapsedMs}ms 後終止`,
  },
  {
    id: "mem-bomb",
    what: "記憶體炸彈（每次 32MB，最多 6.4GB）",
    src: `#include <cstdio>
#include <cstdlib>
#include <cstring>
int main(){
  int i = 0;
  for (; i < 200; ++i) {
    char* p = (char*)malloc(32u << 20);
    if (!p) break;
    memset(p, 0xAB, 32u << 20);
  }
  printf("stopped at chunk %d\\n", i);
  return 3;
}`,
    expect: (r) => r.peakMemoryBytes <= MEM_MB * 1048576 * 1.15,
    describe: (r) => `峰值 ${(r.peakMemoryBytes / 1048576).toFixed(0)}MB（上限 ${MEM_MB}MB）`,
  },
  {
    id: "output-flood",
    what: "輸出洪水（40MB，上限 1MB）",
    src: `#include <cstdio>
int main(){
  static char buf[64 * 1024];
  for (int i = 0; i < 640; ++i) fwrite(buf, 1, sizeof(buf), stdout);
  fflush(stdout);
  return 0;
}`,
    expect: async (r) => {
      const s = await sizeOf(path.join(BUILD, "output-flood.child.txt"));
      return r.stdoutTruncated === true && s <= OUT_CAP + 64 * 1024;
    },
    describe: async (r) => {
      const s = await sizeOf(path.join(BUILD, "output-flood.child.txt"));
      return `產生 ${(r.stdoutBytes / 1048576).toFixed(1)}MB → 落地 ${(s / 1024).toFixed(0)}KB（截斷=${r.stdoutTruncated}）`;
    },
  },
  {
    id: "orphan-child",
    what: "孤兒行程（父行程先退出，子行程不該存活）",
    src: `${SPAWN}
int main(){ spawn_sleeper(); return 0; }`,
    expect: async () => !(await aliveSleepers()),
    describe: async () => ((await aliveSleepers()) ? "仍有 sleeper.exe 存活（失敗）" : "已清除，無殘留"),
  },
  {
    id: "proc-flood",
    what: "行程爆量（連開 10 個長命子行程，上限 4）",
    src: `#include <process.h>
#include <cstdio>
#include <cstdlib>
int main(){
  int ok = 0, fail = 0;
  for (int i = 0; i < 10; ++i) {
    intptr_t h = _spawnl(_P_NOWAIT, "sleeper.exe", "sleeper.exe", (char*)nullptr);
    if (h == -1) ++fail; else ++ok;
  }
  printf("spawned_ok=%d failed=%d\\n", ok, fail);
  fflush(stdout);
  return 0;
}`,
    // 判準：主行程本身必須跑完（沒有被拖垮），且失敗數 > 0（代表上限生效）
    expect: async (r) => {
      const out = await readFile(path.join(BUILD, "proc-flood.child.txt"), "utf8").catch(() => "");
      const m = out.match(/spawned_ok=(\d+) failed=(\d+)/);
      return r.timedOut === false && m !== null && Number(m[2]) > 0;
    },
    describe: async (r) => {
      const out = await readFile(path.join(BUILD, "proc-flood.child.txt"), "utf8").catch(() => "");
      return out.match(/spawned_ok=\d+ failed=\d+/)?.[0] ?? `(無輸出, timedOut=${r.timedOut})`;
    },
  },
];

async function main() {
  await rm(BUILD, { recursive: true, force: true });
  await mkdir(BUILD, { recursive: true });
  await mkdir(path.dirname(OUT_JSON), { recursive: true });

  if ((await stat(SANDBOX).catch(() => null)) === null) {
    console.error(`找不到 ${SANDBOX}`);
    process.exit(1);
  }

  // 輔助程式：長命子行程（60 秒）
  await writeFile(path.join(BUILD, "sleeper.cpp"), `#include <windows.h>\nint main(){ Sleep(60000); return 0; }`, "utf8");
  const c1 = await runToFile(GXX, ["-std=c++20", "-O2", "sleeper.cpp", "-o", "sleeper.exe"], "build-sleeper");
  console.log(`sleeper.exe ${c1.code === 0 ? "建置 OK" : "建置失敗: " + c1.err.slice(0, 200)}`);
  console.log(`限制：記憶體 ${MEM_MB}MB / 逾時 ${TIMEOUT_MS}ms / 行程數 ${PROCS} / 輸出上限 ${OUT_CAP / 1024}KB\n`);

  const results = [];
  for (const p of PROGRAMS) {
    await writeFile(path.join(BUILD, `${p.id}.cpp`), p.src, "utf8");
    const cb = await runToFile(GXX, ["-std=c++20", "-O2", `${p.id}.cpp`, "-o", `${p.id}.exe`], `build-${p.id}`);
    if (cb.code !== 0) {
      console.log(`  BUILD-FAIL ${p.id}: ${cb.err.slice(0, 200)}`);
      results.push({ id: p.id, what: p.what, verdict: "BUILD_FAIL", detail: cb.err.slice(0, 200) });
      continue;
    }

    const metaFile = path.join(BUILD, `${p.id}.meta.json`);
    await runToFile(SANDBOX, [
      "--exe", path.join(BUILD, `${p.id}.exe`),
      "--timeout-ms", String(TIMEOUT_MS),
      "--mem-mb", String(MEM_MB),
      "--procs", String(PROCS),
      "--out-cap", String(OUT_CAP),
      "--out", path.join(BUILD, `${p.id}.child.txt`),
      "--err", path.join(BUILD, `${p.id}.child-err.txt`),
      "--json", metaFile,
    ], `sb-${p.id}`, { watchdogMs: TIMEOUT_MS + 30000 });

    let meta = null;
    try { meta = JSON.parse(await readFile(metaFile, "utf8")); } catch { /* ignore */ }
    if (!meta) {
      console.log(`  ??    ${p.id.padEnd(14)} 沒有 meta 檔`);
      results.push({ id: p.id, what: p.what, verdict: "NO_META" });
      continue;
    }

    const passed = await p.expect(meta);
    const detail = await p.describe(meta);
    results.push({ id: p.id, what: p.what, verdict: passed ? "PASS" : "FAIL", detail, meta });
    console.log(`  ${passed ? "PASS" : "FAIL"}  ${p.id.padEnd(14)} ${detail}`);
  }

  // 清理殘留
  await runToFile(path.join(process.env.SystemRoot || "C:\\Windows", "System32", "taskkill.exe"),
    ["/IM", "sleeper.exe", "/F"], "cleanup");

  const pass = results.filter((r) => r.verdict === "PASS").length;
  console.log(`\n沙箱測試：${pass}/${results.length} 通過`);
  await writeFile(OUT_JSON, JSON.stringify({
    testedAt: new Date().toISOString(),
    limits: { MEM_MB, TIMEOUT_MS, PROCS, OUT_CAP },
    results,
  }, null, 2), "utf8");
  console.log(`報告 → ${OUT_JSON}`);
}

await main();
