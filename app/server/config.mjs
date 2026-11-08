// CppForge 產品：路徑與環境設定
//
// 所有路徑集中在此。關鍵規則（來自 POC 實測）：
//   工具鏈與建置目錄必須是純 ASCII —— MinGW 的 ld.exe 無法處理非 ASCII 路徑。

import path from "node:path";
import process from "node:process";
import {
  BIN, BUILD_ROOT, GXX, HOME, TOOLCHAIN_DIR, assertAscii, isAscii,
} from "../../lib/paths.mjs";

export const APP_DIR = path.resolve(import.meta.dirname, "..");
export const REPO_DIR = path.resolve(APP_DIR, "..");
export const LIB_DIR = path.join(REPO_DIR, "lib");
export const WEB_DIR = path.join(APP_DIR, "web");
export const CONTENT_DIR = path.join(APP_DIR, "content");
export const VENDOR_DIR = path.join(APP_DIR, ".vendor", "node_modules");
// Monaco 的 AMD 發行版：URL /vendor/monaco/vs/… 對應到 min/vs/…
export const MONACO_DIR = path.join(VENDOR_DIR, "monaco-editor", "min");

export const DB_PATH = path.join(HOME, "cppforge.db");
export const SANDBOX_EXE = path.join(BUILD_ROOT, "bin", "sandbox.exe");
export const RUNS_DIR = path.join(BUILD_ROOT, "runs");

export const PORT = Number(process.env.CPPFORGE_PORT || 4173);
export const HOST = process.env.CPPFORGE_HOST || "127.0.0.1";

export { BIN, BUILD_ROOT, GXX, HOME, TOOLCHAIN_DIR, assertAscii, isAscii };

/** 環境是否就緒（工具鏈存在） */
export const toolchainReady = () => isAscii(HOME);
