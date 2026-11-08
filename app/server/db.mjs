// CppForge 產品：進度儲存（node:sqlite，零原生模組）
//
// 為什麼用內建的 node:sqlite：better-sqlite3 需要 node-gyp + MSVC 編譯，
// 而參考機器上沒有 MSVC。Node 24 內建 SQLite，直接用即可。
//
// 資料庫放 HOME（ASCII 路徑），不放 workspace —— 避免 OneDrive 同步衝突。

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { DB_PATH, HOME } from "./config.mjs";

mkdirSync(HOME, { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS progress (
    node_id       TEXT PRIMARY KEY,
    attempts      INTEGER NOT NULL DEFAULT 0,
    failed_runs   INTEGER NOT NULL DEFAULT 0,
    best_score    REAL    NOT NULL DEFAULT 0,
    passed        INTEGER NOT NULL DEFAULT 0,
    passed_at     TEXT,
    updated_at    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id    TEXT    NOT NULL,
    code       TEXT    NOT NULL,
    passed     INTEGER NOT NULL,
    score      REAL    NOT NULL,
    report     TEXT    NOT NULL,
    created_at TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_attempts_node ON attempts(node_id, id DESC);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- ── 間隔複習（FSRS 形式）────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS cards (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    source         TEXT NOT NULL UNIQUE, -- 'concept:L1.02:0' / 'error:undefined-reference'
    kind           TEXT NOT NULL,        -- 'concept' | 'error'
    node_id        TEXT,
    front          TEXT NOT NULL,
    back           TEXT NOT NULL,
    stability      REAL NOT NULL DEFAULT 0,
    difficulty     REAL NOT NULL DEFAULT 0,
    reps           INTEGER NOT NULL DEFAULT 0,
    lapses         INTEGER NOT NULL DEFAULT 0,
    due_at         TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    last_review_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due_at);

  CREATE TABLE IF NOT EXISTS reviews (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id       INTEGER NOT NULL,
    grade         INTEGER NOT NULL,
    interval_days REAL    NOT NULL,
    created_at    TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_card ON reviews(card_id, id DESC);
`);

const nowIso = () => new Date().toISOString();

const q = {
  allProgress: db.prepare("SELECT * FROM progress"),
  one: db.prepare("SELECT * FROM progress WHERE node_id = ?"),
  lastAttempt: db.prepare("SELECT code, created_at FROM attempts WHERE node_id = ? ORDER BY id DESC LIMIT 1"),
  insertAttempt: db.prepare(
    "INSERT INTO attempts(node_id, code, passed, score, report, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ),
  upsert: db.prepare(`
    INSERT INTO progress(node_id, attempts, failed_runs, best_score, passed, passed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(node_id) DO UPDATE SET
      attempts    = excluded.attempts,
      failed_runs = excluded.failed_runs,
      best_score  = MAX(progress.best_score, excluded.best_score),
      passed      = MAX(progress.passed, excluded.passed),
      passed_at   = COALESCE(progress.passed_at, excluded.passed_at),
      updated_at  = excluded.updated_at
  `),
  countAttempts: db.prepare("SELECT COUNT(*) AS n FROM attempts"),
  countPassed: db.prepare("SELECT COUNT(*) AS n FROM progress WHERE passed = 1"),
  firstTryPassed: db.prepare(
    "SELECT COUNT(*) AS n FROM progress WHERE passed = 1 AND failed_runs = 0",
  ),
  setting: db.prepare("SELECT value FROM settings WHERE key = ?"),
  setSetting: db.prepare(
    "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ),
};

/** 全部節點的進度（Map<nodeId, row>） */
export function allProgress() {
  const map = new Map();
  for (const row of q.allProgress.all()) map.set(row.node_id, row);
  return map;
}

export function progressOf(nodeId) {
  return q.one.get(nodeId) ?? null;
}

export function lastSubmission(nodeId) {
  return q.lastAttempt.get(nodeId) ?? null;
}

/** 記錄一次評測；回傳更新後的進度與「是否首次通過」 */
export function recordAttempt({ nodeId, code, passed, score, report }) {
  const at = nowIso();
  q.insertAttempt.run(nodeId, code, passed ? 1 : 0, score, JSON.stringify(report), at);

  const prev = progressOf(nodeId);
  const attempts = (prev?.attempts ?? 0) + 1;
  const failedRuns = (prev?.failed_runs ?? 0) + (passed ? 0 : 1);
  const firstPass = passed && !prev?.passed;

  q.upsert.run(
    nodeId, attempts, failedRuns, score,
    passed ? 1 : 0,
    firstPass ? at : null,
    at,
  );

  return { attempts, failedRuns, firstPass, passed: passed || !!prev?.passed };
}

/** 總覽統計（含「獨立完成率」：首次提交就通過的比例） */
export function stats() {
  const totalNodes = Number(q.countPassed.all()[0]?.n ?? 0);
  const firstTry = Number(q.firstTryPassed.all()[0]?.n ?? 0);
  return {
    passedNodes: totalNodes,
    firstTryPassed: firstTry,
    independentRate: totalNodes === 0 ? 0 : firstTry / totalNodes,
    totalAttempts: Number(q.countAttempts.all()[0]?.n ?? 0),
  };
}

export function getSetting(key, fallback = null) {
  const row = q.setting.get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  q.setSetting.run(key, String(value));
}

// ── 間隔複習 ────────────────────────────────────────────────────────

const cq = {
  upsertCard: db.prepare(`
    INSERT INTO cards(source, kind, node_id, front, back, due_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source) DO UPDATE SET
      front   = excluded.front,
      back    = excluded.back,
      node_id = COALESCE(excluded.node_id, cards.node_id)
  `),
  bySource: db.prepare("SELECT * FROM cards WHERE source = ?"),
  byId: db.prepare("SELECT * FROM cards WHERE id = ?"),
  due: db.prepare("SELECT * FROM cards WHERE due_at <= ? ORDER BY due_at ASC LIMIT ?"),
  allDueCount: db.prepare("SELECT COUNT(*) AS n FROM cards WHERE due_at <= ?"),
  total: db.prepare("SELECT COUNT(*) AS n FROM cards"),
  learned: db.prepare("SELECT COUNT(*) AS n FROM cards WHERE reps > 0"),
  updateSchedule: db.prepare(`
    UPDATE cards SET stability = ?, difficulty = ?, reps = ?, lapses = ?,
                     due_at = ?, last_review_at = ?
    WHERE id = ?
  `),
  insertReview: db.prepare(
    "INSERT INTO reviews(card_id, grade, interval_days, created_at) VALUES (?, ?, ?, ?)",
  ),
  recentReviews: db.prepare("SELECT grade FROM reviews ORDER BY id DESC LIMIT ?"),
  reviewsToday: db.prepare("SELECT COUNT(*) AS n FROM reviews WHERE created_at >= ?"),
  reviewsByDay: db.prepare(`
    SELECT substr(created_at, 1, 10) AS day, grade, COUNT(*) AS n
    FROM reviews WHERE created_at >= ?
    GROUP BY day, grade ORDER BY day
  `),
  gradesAll: db.prepare("SELECT grade, COUNT(*) AS n FROM reviews GROUP BY grade ORDER BY grade"),
  dueByDay: db.prepare(`
    SELECT substr(due_at, 1, 10) AS day, COUNT(*) AS n
    FROM cards WHERE due_at >= ? AND due_at < ?
    GROUP BY day ORDER BY day
  `),
};

/** 新增或更新一張卡（排程狀態保留，只更新內容） */
export function upsertCard({ source, kind, nodeId = null, front, back, dueAt = null }) {
  const at = nowIso();
  cq.upsertCard.run(source, kind, nodeId, front, back, dueAt ?? at, at);
  return cq.bySource.get(source);
}

export function cardById(id) {
  return cq.byId.get(id) ?? null;
}

export function cardBySource(source) {
  return cq.bySource.get(source) ?? null;
}

/** 到期的卡（依到期時間排序） */
export function dueCards(nowIsoStr = nowIso(), limit = 20) {
  return cq.due.all(nowIsoStr, limit);
}

export function reviewCounts(nowIsoStr = nowIso()) {
  const recent = cq.recentReviews.all(100).map((r) => r.grade);
  const passed = recent.filter((g) => g >= 3).length;
  return {
    total: Number(cq.total.all()[0]?.n ?? 0),
    due: Number(cq.allDueCount.all(nowIsoStr)[0]?.n ?? 0),
    learned: Number(cq.learned.all()[0]?.n ?? 0),
    reviewsToday: Number(cq.reviewsToday.all(`${nowIsoStr.slice(0, 10)}T00:00:00.000Z`)[0]?.n ?? 0),
    recentRetention: recent.length ? passed / recent.length : null,
  };
}

/** 複習歷史：過去 N 天每天的四種評分次數 + 未來 N 天的到期預測 */
export function reviewHistory(daysBack = 14, daysAhead = 7, nowIsoStr = nowIso()) {
  const dayMs = 86400000;
  const now = Date.parse(nowIsoStr);
  const start = new Date(now - (daysBack - 1) * dayMs).toISOString().slice(0, 10);

  const byDay = new Map();
  for (let i = 0; i < daysBack; i += 1) {
    const day = new Date(now - (daysBack - 1 - i) * dayMs).toISOString().slice(0, 10);
    byDay.set(day, { day, total: 0, again: 0, hard: 0, good: 0, easy: 0 });
  }
  for (const row of cq.reviewsByDay.all(`${start}T00:00:00.000Z`)) {
    const slot = byDay.get(row.day);
    if (!slot) continue;
    const n = Number(row.n);
    slot.total += n;
    if (row.grade === 1) slot.again += n;
    else if (row.grade === 2) slot.hard += n;
    else if (row.grade === 3) slot.good += n;
    else slot.easy += n;
  }

  const grades = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of cq.gradesAll.all()) grades[Number(row.grade)] = Number(row.n);
  const gradedTotal = grades[1] + grades[2] + grades[3] + grades[4];

  const aheadStart = `${nowIsoStr.slice(0, 10)}T00:00:00.000Z`;
  const aheadEnd = new Date(Date.parse(aheadStart) + (daysAhead + 1) * dayMs).toISOString();
  const forecast = [];
  for (let i = 0; i < daysAhead; i += 1) {
    const day = new Date(Date.parse(aheadStart) + i * dayMs).toISOString().slice(0, 10);
    forecast.push({ day, count: 0 });
  }
  const fIndex = new Map(forecast.map((f, i) => [f.day, i]));
  for (const row of cq.dueByDay.all(aheadStart, aheadEnd)) {
    const i = fIndex.get(row.day);
    if (i !== undefined) forecast[i].count = Number(row.n);
  }

  return {
    days: [...byDay.values()],
    grades,
    gradedTotal,
    forecast,
  };
}

/** 套用一次複習結果（排程計算在 srs.mjs，這裡只負責寫入） */
export function saveReview(cardId, scheduleResult, grade, at = nowIso()) {
  cq.updateSchedule.run(
    scheduleResult.stability, scheduleResult.difficulty, scheduleResult.reps,
    scheduleResult.lapses, scheduleResult.dueAt, scheduleResult.lastReviewAt, cardId,
  );
  cq.insertReview.run(cardId, grade, scheduleResult.intervalDays, at);
}
