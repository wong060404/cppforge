// CppForge POC: 統一的路徑解析與 ASCII 守衛
//
// 從實測得到的硬約束（見 docs/01-poc-report.md）：
//   Windows 上 MinGW 的 ld.exe 無法開啟含非 ASCII 字元的路徑，
//   會找不到 crt2.o / -lstdc++，連結必然失敗（cc1plus 反而能讀）。
//   ⇒ 工具鏈與建置目錄一律放在純 ASCII 路徑。
//
// 真實產品：CPPFORGE_HOME 預設 %LOCALAPPDATA%\CppForge
// POC：工作區在 ...\OneDrive\文件\... 底下（非 ASCII），所以強制改到 %TEMP%。

import os from "node:os";
import path from "node:path";
import process from "node:process";

export const isAscii = (p) => !/[^\x00-\x7F]/.test(p);

/** 找出一個可用的 ASCII 家目錄 */
function resolveHome() {
  if (process.env.CPPFORGE_HOME) {
    const p = path.resolve(process.env.CPPFORGE_HOME);
    if (!isAscii(p)) throw new Error(`CPPFORGE_HOME 含非 ASCII 字元，MinGW 無法運作：${p}`);
    return p;
  }
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData && isAscii(localAppData)) return path.join(localAppData, "CppForge");
  const tmp = os.tmpdir();
  if (isAscii(tmp)) return path.join(tmp, "cppforge-home");
  throw new Error(`找不到 ASCII 可用的家目錄（TEMP=${tmp}）`);
}

export const HOME = resolveHome();
// 7z SFX 會解出一個 w64devkit/ 目錄
export const TOOLCHAIN_DIR = path.join(HOME, "w64devkit");
export const BIN = path.join(TOOLCHAIN_DIR, "bin");
export const GXX = path.join(BIN, "g++.exe");
export const GDB = path.join(BIN, "gdb.exe");
export const BUILD_ROOT = path.join(HOME, "build");
export const CACHE_DIR = path.join(HOME, "cache");

export function assertAscii(p, what = "路徑") {
  if (!isAscii(p)) {
    throw new Error(
      `${what}含非 ASCII 字元，MinGW 的 ld.exe 會連結失敗：\n  ${p}\n` +
        `  解法：設定 CPPFORGE_HOME 到純英文路徑（例如 C:\\CppForge）。`,
    );
  }
}

export const summary = () => ({
  home: HOME,
  ascii: isAscii(HOME),
  toolchain: TOOLCHAIN_DIR,
  buildRoot: BUILD_ROOT,
});
