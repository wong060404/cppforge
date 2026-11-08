// CppForge：錯誤圖鑑（比對引擎）
//
// 把評測輸出（編譯器 stderr + 執行期 stderr + 診斷訊息）比對成圖鑑條目。
// 設計原則：
//   1. 比對是「子字串 + 大小寫不敏感」，不做模糊推測 —— 寧可漏，不要給錯答案
//   2. 一條輸出可以命中多條（例如「越界」同時命中 segfault 與 out-of-bounds）
//   3. 命中的條目按「階段」排序：越早發生越前面

import { ENTRIES, STAGES } from "./data/atlas.mjs";

const byStage = (a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage);

// 圖鑑條目 → 相關課程：靠 `concepts` 標籤與節點宣告的 concepts 取交集。
// 這樣新增節點時會自動接上，不需要回頭手動維護對照表。
let nodeIndex = null;

/** 由呼叫端注入節點清單（避免 atlas 依賴 content 模組造成循環） */
export function setNodeIndex(nodes) {
  nodeIndex = nodes.map((n) => ({
    id: n.id,
    title: n.title,
    level: n.level,
    concepts: new Set(n.concepts ?? []),
  }));
}

function relatedFor(entry, limit = 3) {
  if (!nodeIndex || !entry.concepts?.length) return [];
  const scored = [];
  for (const n of nodeIndex) {
    let hits = 0;
    for (const c of entry.concepts) {
      if (n.concepts.has(c)) hits += 1;
    }
    if (hits > 0) scored.push({ node: n, hits });
  }
  scored.sort((a, b) => b.hits - a.hits || a.node.level - b.node.level || a.node.id.localeCompare(b.node.id));
  return scored.slice(0, limit).map((s) => ({ id: s.node.id, title: s.node.title, level: s.node.level }));
}

/** 全部條目（給 UI 列表用；不含 match，避免洩漏實作細節） */
export function listAtlas() {
  return ENTRIES.map(({ match, ...rest }) => ({
    ...rest,
    related: relatedFor(rest),
  })).sort(byStage);
}

export function getEntry(id) {
  const e = ENTRIES.find((x) => x.id === id);
  if (!e) return null;
  const { match, ...rest } = e;
  return { ...rest, related: relatedFor(rest) };
}

/**
 * 從一段原始輸出找出相關條目。
 * @param {string} haystack 編譯器 / 執行期的原文
 * @param {string[]} extra  額外的結構化訊息（例如診斷的 message 欄位）
 */
export function matchAtlas(haystack, extra = [], limit = 3) {
  const hay = `${haystack ?? ""}\n${extra.join("\n")}`.toLowerCase();
  if (!hay.trim()) return [];

  const hits = [];
  for (const e of ENTRIES) {
    if (e.match.some((m) => hay.includes(m.toLowerCase()))) hits.push(e);
  }
  return hits.sort(byStage).slice(0, limit).map(({ match, ...rest }) => ({
    id: rest.id,
    title: rest.title,
    stage: rest.stage,
    symptom: rest.symptom,
    why: rest.why,
    fixes: rest.fixes,
  }));
}

export { STAGES };
