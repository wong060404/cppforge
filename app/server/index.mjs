// CppForge 產品：HTTP 服務
//
// 為什麼用 node:http 而不是框架：單一使用者、無需 middleware、
// 啟動時間 <100ms，且不引入任何 npm 依賴（除了選用的 Monaco）。
//
// 啟動：node app/server/index.mjs      （預設 http://127.0.0.1:4173）

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  CONTENT_DIR, GXX, HOST, MONACO_DIR, PORT, WEB_DIR,
} from "./config.mjs";
import {
  allProgress, draftOf, lastSubmission, progressOf, recordAttempt, reviewHistory, saveDraftCode, stats,
} from "./db.mjs";
import { courseTree, lintContent, loadNode, scanNodes } from "./content.mjs";
import { evaluateNode } from "./grading.mjs";
import { doctorReport, installToolchain } from "./doctor.mjs";
import { getEntry, listAtlas, setNodeIndex } from "./atlas.mjs";
import {
  addErrorCards, gradeCard, reviewQueue, syncContentCards,
} from "./review.mjs";
import { reviewCounts } from "./db.mjs";

const exists = (p) => stat(p).then(() => true, () => false);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

function sendJson(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(body);
}

function sendText(res, code, text, type = "text/plain; charset=utf-8") {
  res.writeHead(code, { "content-type": type, "content-length": Buffer.byteLength(text) });
  res.end(text);
}

async function serveFile(res, filePath) {
  if (!(await exists(filePath))) return sendText(res, 404, "not found");
  const info = await stat(filePath);
  if (!info.isFile()) return sendText(res, 404, "not found");
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "content-type": MIME[ext] ?? "application/octet-stream",
    "content-length": info.size,
    "cache-control": ext === ".map" ? "public, max-age=86400" : "no-cache",
  });
  createReadStream(filePath).pipe(res);
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("payload too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** 讀 JSON body；壞掉的 JSON 或超過上限一律回 4xx（而不是讓它變成 500） */
async function readJsonBody(req, res) {
  let raw;
  try {
    raw = await readBody(req);
  } catch (err) {
    const tooBig = /payload too large/i.test(String(err?.message ?? ""));
    sendJson(res, tooBig ? 413 : 400, {
      error: tooBig ? "PAYLOAD_TOO_LARGE" : "BAD_BODY",
      message: tooBig ? "request body 過大（上限 2 MB）" : "無法讀取 request body",
    });
    return null;
  }
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      sendJson(res, 400, { error: "BAD_JSON", message: "body 必須是 JSON object" });
      return null;
    }
    return parsed;
  } catch {
    sendJson(res, 400, { error: "BAD_JSON", message: "body 不是合法 JSON" });
    return null;
  }
}

const decode = (s) => decodeURIComponent(s);

async function handleApi(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]

  // GET /api/health
  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, gxx: GXX, version: process.version });
  }

  // GET /api/course
  if (req.method === "GET" && url.pathname === "/api/course") {
    const levels = await courseTree(allProgress());
    return sendJson(res, 200, { levels, stats: stats() });
  }

  // GET /api/stats
  if (req.method === "GET" && url.pathname === "/api/stats") {
    return sendJson(res, 200, stats());
  }

  // GET /api/atlas          全部錯誤圖鑑條目（含 related：相關課程）
  // GET /api/atlas/:id      單一條目
  if (req.method === "GET" && parts[1] === "atlas") {
    // 圖鑑 ←→ 課程 的連結靠 concepts 標籤比對，所以先注入節點索引
    setNodeIndex(await scanNodes());
    if (parts[2]) {
      const entry = getEntry(decode(parts[2]));
      if (!entry) return sendJson(res, 404, { error: "entry not found" });
      return sendJson(res, 200, entry);
    }
    return sendJson(res, 200, { entries: listAtlas() });
  }

  // GET /api/review            待複習佇列（含四個按鈕的間隔預覽）
  // GET /api/review/stats      複習統計
  // GET /api/review/insights   複習歷史（每日次數、評分分布、未來到期預測）
  // POST /api/review/:id       評分一張卡 { grade: 1..4 }
  if (parts[1] === "review") {
    if (req.method === "GET" && parts[2] === "stats") {
      return sendJson(res, 200, reviewCounts());
    }
    if (req.method === "GET" && parts[2] === "insights") {
      return sendJson(res, 200, { ...reviewCounts(), ...reviewHistory() });
    }
    if (req.method === "GET" && parts.length === 2) {
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
      return sendJson(res, 200, reviewQueue(limit));
    }
    if (req.method === "POST" && parts[2]) {
      const body = await readJsonBody(req, res);
      if (body === null) return; // 已回 400
      const grade = Number(body.grade);
      if (![1, 2, 3, 4].includes(grade)) {
        return sendJson(res, 400, { error: "BAD_GRADE", message: "grade 必須是 1..4" });
      }
      const cardId = Number(decode(parts[2]));
      if (!Number.isInteger(cardId)) {
        return sendJson(res, 400, { error: "BAD_CARD_ID", message: "card id 必須是整數" });
      }
      const result = gradeCard(cardId, grade);
      if (!result) return sendJson(res, 404, { error: "CARD_NOT_FOUND" });
      return sendJson(res, 200, result);
    }
  }

  // GET /api/doctor
  if (req.method === "GET" && url.pathname === "/api/doctor") {
    return sendJson(res, 200, await doctorReport());
  }

  // POST /api/doctor/install
  if (req.method === "POST" && url.pathname === "/api/doctor/install") {
    const result = await installToolchain();
    return sendJson(res, 200, { ...result, doctor: await doctorReport() });
  }

  // GET /api/content/lint
  if (req.method === "GET" && url.pathname === "/api/content/lint") {
    return sendJson(res, 200, await lintContent());
  }

  // GET /api/nodes/:id   |   POST /api/nodes/:id/run   |   POST /api/nodes/:id/draft
  if (parts[0] === "api" && parts[1] === "nodes" && parts[2]) {
    const id = decode(parts[2]);
    const progress = allProgress();

    if (req.method === "GET" && parts.length === 3) {
      const draft = draftOf(id);
      const node = await loadNode(id, progress, { draft: draft?.code ?? null });
      if (!node) return sendJson(res, 404, { error: "node not found" });
      const last = lastSubmission(id);
      return sendJson(res, 200, {
        ...node,
        draftAt: draft?.updatedAt ?? null,
        lastCode: last?.code ?? null,
        lastAt: last?.created_at ?? null,
      });
    }

    // 自動儲存的草稿：只寫入，不做評測（打字時每 1–2 秒呼叫一次）
    if (req.method === "POST" && parts[3] === "draft") {
      const body = await readJsonBody(req, res);
      if (body === null) return;
      if (typeof body.code !== "string") {
        return sendJson(res, 400, { error: "BAD_CODE", message: "code 必須是字串" });
      }
      if (body.code.length > 512 * 1024) {
        return sendJson(res, 413, { error: "CODE_TOO_LONG", message: "草稿過長（上限 512 KB）" });
      }
      const nodes = await scanNodes();
      if (!nodes.some((n) => n.id === id)) return sendJson(res, 404, { error: "node not found" });
      saveDraftCode(id, body.code);
      return sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
    }

    if (req.method === "POST" && parts[3] === "run") {
      const body = await readJsonBody(req, res);
      if (body === null) return; // 已回 400
      if (typeof body.code !== "string") {
        return sendJson(res, 400, { error: "BAD_CODE", message: "code 必須是字串" });
      }
      const code = body.code;
      if (code.length > 512 * 1024) return sendJson(res, 413, { error: "CODE_TOO_LONG", message: "程式碼過長（上限 512 KB）" });

      const nodes = await scanNodes();
      const node = nodes.find((n) => n.id === id);
      if (!node) return sendJson(res, 404, { error: "node not found" });

      // 自由存取：不再檢查先修。prerequisites 僅用於 UI 的「建議先看過」提示。
      const t0 = Date.now();
      let report;
      try {
        report = await evaluateNode(node, code);
      } catch (err) {
        const msg = String(err.message ?? err);
        if (msg === "TOOLCHAIN_MISSING") {
          return sendJson(res, 503, {
            error: "TOOLCHAIN_MISSING",
            message: "找不到 C++ 編譯器，請先到「環境檢查」安裝工具鏈。",
          });
        }
        console.error("[run] 評測失敗:", err);
        return sendJson(res, 500, { error: "GRADING_FAILED", message: msg.slice(0, 400) });
      }

      const saved = recordAttempt({
        nodeId: id,
        code,
        passed: report.passed,
        score: report.score,
        report,
      });

      // 失敗時把他踩到的錯誤變成複習卡（這是「錯誤卡」的來源）
      const newCards = report.passed ? 0 : addErrorCards(report.atlas ?? []);

      // 通過後可能解鎖新節點 → 補上那一節的概念卡
      await syncContentCards();

      const levels = await courseTree(allProgress());
      return sendJson(res, 200, {
        report,
        saved,
        newCards,
        stats: stats(),
        review: reviewCounts(),
        levels,
        elapsedMs: Date.now() - t0,
      });
    }
  }

  return sendJson(res, 404, { error: "unknown endpoint" });
}

const handler = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  const pathname = url.pathname;

  try {
    if (pathname.startsWith("/api/")) return await handleApi(req, res, url);

    // Monaco（選用）
    if (pathname.startsWith("/vendor/monaco/")) {
      const rel = pathname.slice("/vendor/monaco/".length);
      const target = path.join(MONACO_DIR, rel);
      if (!target.startsWith(MONACO_DIR)) return sendText(res, 403, "forbidden");
      return await serveFile(res, target);
    }

    // 靜態 UI
    if (pathname === "/" || pathname === "/index.html") {
      return await serveFile(res, path.join(WEB_DIR, "index.html"));
    }
    const webTarget = path.join(WEB_DIR, pathname.replace(/^\/+/, ""));
    if (!webTarget.startsWith(WEB_DIR)) return sendText(res, 403, "forbidden");
    if (await exists(webTarget)) return await serveFile(res, webTarget);

    return sendText(res, 404, "not found");
  } catch (err) {
    console.error("[server]", err);
    if (!res.headersSent) sendJson(res, 500, { error: "INTERNAL", message: String(err.message ?? err) });
    else res.end();
  }
};

// 監聽。
//
// 為什麼要兩個位址：Windows 上 `localhost` 會先解析成 IPv6 的 `::1`，
// 若只綁 127.0.0.1，瀏覽器就可能出現「無法連線」——而用 127.0.0.1 又打得開。
// 所以 loopback 設定時兩個都聽（仍然只限本機，不對外開放）。
const urls = [];

function listen(host, label) {
  return new Promise((resolve) => {
    const srv = createServer(handler);
    srv.on("error", (err) => {
      // IPv6 不可用、或該位址被佔用時，只警告不中斷
      if (err.code === "EADDRNOTAVAIL" || err.code === "EAFNOSUPPORT" || err.code === "EADDRINUSE") {
        console.log(`[略過] ${label} ${host}:${PORT} — ${err.code}`);
        resolve(null);
        return;
      }
      throw err;
    });
    srv.listen(PORT, host, () => {
      urls.push(`http://${label}:${PORT}`);
      resolve(srv);
    });
  });
}

const isLoopback = HOST === "127.0.0.1" || HOST === "localhost" || HOST === "::1";

const servers = [];
servers.push(await listen(HOST, HOST === "::1" ? "[::1]" : HOST));
if (isLoopback) {
  // 補上另一個 loopback 家族，避免 localhost 解析到不同 IP 時連不上
  if (HOST !== "127.0.0.1") servers.push(await listen("127.0.0.1", "127.0.0.1"));
  if (HOST !== "::1") servers.push(await listen("::1", "[::1]"));
}

console.log(`CppForge  ${urls.join("   ")}`);
console.log(`內容目錄  ${CONTENT_DIR}`);
console.log(`資料庫    ${process.env.CPPFORGE_HOME ?? "(預設)"}`);
if (!isLoopback) console.log(`⚠ 目前綁在 ${HOST}，同網段的其他機器可以連進來（會執行你寫的程式）`);

syncContentCards()
  .then((n) => console.log(`複習卡同步  ${n} 張概念卡`))
  .catch((err) => console.error("[syncContentCards]", err));

process.on("unhandledRejection", (err) => console.error("[unhandledRejection]", err));
process.on("uncaughtException", (err) => console.error("[uncaughtException]", err));
