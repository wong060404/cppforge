// CppForge：複習系統的領域邏輯
//
// 卡片有兩個來源：
//   1. 概念卡（concept）：寫在 node.json 的 `cards` 裡，隨課程一起版控
//   2. 錯誤卡（error）：學員實際踩過的錯誤，自動從錯誤圖鑑生成
//
// 為什麼要有錯誤卡：這是本產品跟一般單字卡最大的差別 ——
// 你練的不是別人的重點，而是**你自己犯過的錯**。

import {
  allProgress, cardById, cardBySource, dueCards, reviewCounts, saveReview, upsertCard,
} from "./db.mjs";
import { previewIntervals, formatInterval, schedule } from "./srs.mjs";
import { scanNodes } from "./content.mjs";
import { getEntry } from "./atlas.mjs";

const nowIso = () => new Date().toISOString();

/**
 * 把課程裡宣告的 concept 卡同步進資料庫（幂等）。
 *
 * 只為「已解鎖」的節點建卡 —— 這是刻意的教學設計：
 * 讓你複習還沒讀過的課，只會逼你按「忘記了」，反而污染排程。
 * 已存在的卡只更新文字，不動排程狀態。
 */
export async function syncContentCards() {
  const nodes = await scanNodes();
  const passed = new Set(
    [...allProgress().values()].filter((p) => p.passed).map((p) => p.node_id),
  );

  let created = 0;
  for (const node of nodes) {
    const unlocked = (node.prerequisites ?? []).every((p) => passed.has(p));
    if (!unlocked) continue;
    for (const [i, c] of (node.cards ?? []).entries()) {
      if (!c.q || !c.a) continue;
      upsertCard({
        source: `concept:${node.id}:${i}`,
        kind: "concept",
        nodeId: node.id,
        front: c.q,
        back: c.a,
      });
      created += 1;
    }
  }
  return created;
}

/**
 * 把這次評測命中的錯誤圖鑑條目變成卡片。
 * 同一條錯誤只會有一張卡（source 唯一），所以重複犯錯是累積複習記錄，不是長出新卡。
 */
export function addErrorCards(atlasEntries = []) {
  let added = 0;
  for (const e of atlasEntries) {
    const entry = getEntry(e.id);
    if (!entry) continue;
    const source = `error:${e.id}`;
    const existed = Boolean(cardBySource(source));
    const front = `你遇到過：${entry.symptom}`;
    const back = [
      `**${entry.title}**（${entry.stage}階段）`,
      "",
      entry.why,
      "",
      "怎麼修：",
      ...(entry.fixes ?? []).map((f) => `- ${f}`),
    ].join("\n");
    upsertCard({ source, kind: "error", front, back });
    // 只回報「真的新建」的卡；重複犯同一個錯不該讓 UI 說「新增了 1 張」
    if (!existed) added += 1;
  }
  return added;
}

/** 待複習佇列（含四個按鈕的間隔預覽） */
export function reviewQueue(limit = 20) {
  const now = new Date();
  const cards = dueCards(now.toISOString(), limit).map((c) => {
    const intervals = previewIntervals({
      stability: c.stability,
      difficulty: c.difficulty,
      reps: c.reps,
      lapses: c.lapses,
      lastReviewAt: c.last_review_at,
    }, now);
    // 由伺服器算好人類可讀字串，前端不必重複實作 formatInterval
    const intervalLabels = Object.fromEntries(
      Object.entries(intervals).map(([g, d]) => [g, formatInterval(d)]),
    );
    return {
      id: c.id,
      kind: c.kind,
      nodeId: c.node_id,
      front: c.front,
      back: c.back,
      reps: c.reps,
      lapses: c.lapses,
      stability: Number(c.stability.toFixed(2)),
      difficulty: Number(c.difficulty.toFixed(2)),
      dueAt: c.due_at,
      intervals,
      intervalLabels,
    };
  });
  return { cards, counts: reviewCounts(nowIso()) };
}

/** 評分一張卡；回傳這次的間隔與剩餘待複習数 */
export function gradeCard(cardId, grade) {
  const card = cardById(cardId);
  if (!card) return null;
  const now = new Date();
  const result = schedule({
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    lastReviewAt: card.last_review_at,
  }, grade, now);

  saveReview(cardId, result, grade, now.toISOString());
  return {
    intervalDays: result.intervalDays,
    intervalLabel: formatInterval(result.intervalDays),
    dueAt: result.dueAt,
    stability: Number(result.stability.toFixed(2)),
    counts: reviewCounts(now.toISOString()),
  };
}

export { reviewCounts };
