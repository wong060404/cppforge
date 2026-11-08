#!/usr/bin/env node
// CppForge：排程演算法的單元測試（純函式，不需要伺服器）
//
// 這些是「規格」而不是「實作細節」：
//   - 遺忘曲線在 t = S 時必須 ≈ 0.9（這是 FSRS 的定義）
//   - 評分越高，間隔越長（單調性）
//   - 難度越高，間隔越短
//   - 忘記一次必須讓穩定度顯著下降
// 如果哪天改了權重而破壞這些性質，這裡會先炸。

import {
  GRADE_LABELS, LIMITS, formatInterval, intervalFor, newCard,
  previewIntervals, retrievability, schedule,
} from "../server/srs.mjs";

const failures = [];
const check = (ok, label, extra = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${extra ? `  ← ${extra}` : ""}`);
  if (!ok) failures.push(label);
};
const near = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps;

console.log("SRS 排程測試\n");

// ── 遺忘曲線 ────────────────────────────────────────────────────────
console.log("【遺忘曲線】");
check(near(retrievability(0, 5), 1), "t=0 時記得機率為 1", retrievability(0, 5).toFixed(4));
check(near(retrievability(5, 5), 0.9, 0.005), "t=S 時記得機率 ≈ 0.9（FSRS 定義）", retrievability(5, 5).toFixed(4));
const r1 = retrievability(3, 10);
const r2 = retrievability(6, 10);
check(r1 > r2, "時間越久記得機率越低", `${r1.toFixed(3)} > ${r2.toFixed(3)}`);
check(near(intervalFor(10, 0.9), 10, 0.05), "intervalFor(S, 0.9) ≈ S", intervalFor(10, 0.9).toFixed(3));

// ── 單調性：評分 ────────────────────────────────────────────────────
console.log("\n【單調性：評分越高，間隔越長】");
const fresh = newCard();
const byGrade = [1, 2, 3, 4].map((g) => schedule(fresh, g).intervalDays);
console.log(`    間隔：${byGrade.map((d) => `${GRADE_LABELS[[1, 2, 3, 4][byGrade.indexOf(d)]] ?? ""}=${d.toFixed(2)}d`).join("  ")}`);
check(byGrade[0] < byGrade[1] && byGrade[1] < byGrade[2] && byGrade[2] < byGrade[3],
  "新卡：again < hard < good < easy", byGrade.map((d) => d.toFixed(2)).join(" < "));

// ── 單調性：難度 ────────────────────────────────────────────────────
console.log("\n【單調性：難度越高，間隔越短】");
const base = { stability: 20, difficulty: 5, reps: 3, lapses: 0, lastReviewAt: new Date(Date.now() - 20 * 86400000).toISOString() };
const easyCard = schedule({ ...base, difficulty: 2 }, 3);
const hardCard = schedule({ ...base, difficulty: 9 }, 3);
check(easyCard.intervalDays > hardCard.intervalDays,
  "同樣評分，低難度的間隔較長", `${easyCard.intervalDays.toFixed(1)}d > ${hardCard.intervalDays.toFixed(1)}d`);

// ── 穩定度成長（模擬真實節奏：到期才複習）──────────────────────────
console.log("\n【穩定度成長】每次都在到期日複習");
let c = newCard();
const growth = [];
for (let i = 0; i < 5; i++) {
  const before = c.stability;
  const at = c.lastReviewAt
    ? new Date(new Date(c.lastReviewAt).getTime() + (c.lastInterval ?? 0) * 86400000)
    : new Date();
  const s = schedule(c, 3, at);
  growth.push(s.stability);
  if (i > 0) {
    check(s.stability > before * 1.05, `第 ${i + 1} 次「想起來」穩定度上升`,
      `${before.toFixed(2)} → ${s.stability.toFixed(2)}`);
  }
  c = {
    stability: s.stability, difficulty: s.difficulty, reps: s.reps,
    lapses: s.lapses, lastReviewAt: s.lastReviewAt, lastInterval: s.intervalDays,
  };
}
console.log(`    穩定度序列：${growth.map((x) => x.toFixed(1)).join(" → ")} 天`);
check(growth[4] > growth[0] * 3, "5 次後穩定度成長 3 倍以上",
  `${growth[0].toFixed(1)} → ${growth[4].toFixed(1)}`);

// ── 忘記的懲罰 ──────────────────────────────────────────────────────
console.log("\n【忘記一次】");
const matured = { stability: 40, difficulty: 5, reps: 6, lapses: 0, lastReviewAt: new Date(Date.now() - 40 * 86400000).toISOString() };
const afterLapse = schedule(matured, 1);
check(afterLapse.stability < matured.stability * 0.3,
  "穩定度大幅下降（< 30%）", `${matured.stability} → ${afterLapse.stability.toFixed(2)}`);
check(afterLapse.lapses === 1, "lapses 計數 +1", String(afterLapse.lapses));
check(afterLapse.intervalDays < 3, "間隔被拉回 3 天內", `${afterLapse.intervalDays.toFixed(2)}d`);

// ── 邊界與合法性 ────────────────────────────────────────────────────
console.log("\n【邊界】");
const all = [];
let cur = newCard();
for (const g of [3, 3, 1, 3, 2, 4, 1, 3]) {
  const s = schedule(cur, g);
  all.push(s);
  cur = { stability: s.stability, difficulty: s.difficulty, reps: s.reps, lapses: s.lapses, lastReviewAt: s.lastReviewAt };
}
check(all.every((s) => Number.isFinite(s.stability) && s.stability > 0), "穩定度永遠是有限正數");
check(all.every((s) => s.difficulty >= LIMITS.minDifficulty && s.difficulty <= LIMITS.maxDifficulty), "難度維持在 [1,10]");
check(all.every((s) => s.intervalDays > 0 && s.intervalDays <= LIMITS.maxIntervalDays), "間隔在 (0, 365] 天內");
check(all.every((s) => !Number.isNaN(new Date(s.dueAt).getTime())), "dueAt 是合法時間");

// ── 預覽 ────────────────────────────────────────────────────────────
console.log("\n【UI 預覽】");
const pv = previewIntervals(matured);
check(pv[1] < pv[2] && pv[2] < pv[3] && pv[3] < pv[4], "四個按鈕的預覽間隔遞增",
  [1, 2, 3, 4].map((g) => `${GRADE_LABELS[g]}=${formatInterval(pv[g])}`).join("  "));
check(/分鐘|小時|天|個月|年/.test(formatInterval(0.02)), "formatInterval 產生人類可讀字串", formatInterval(0.02));
check(formatInterval(100) === "3.3 個月" || /個月/.test(formatInterval(100)), "100 天顯示為月", formatInterval(100));

console.log("");
if (failures.length) {
  console.log(`\x1b[31m${failures.length} 項失敗\x1b[0m`);
  process.exit(1);
}
console.log("\x1b[32mSRS 排程測試全部通過\x1b[0m");
