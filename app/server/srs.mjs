// CppForge：間隔重複排程（FSRS 形式）
//
// 誠實說明（重要）：
//   這裡用的是 FSRS 的「模型形式」——遺忘曲線 R(t) = (1 + 19/81 · t/S)^(-0.5)、
//   四個評分、難度會做均值回歸——但**權重是手動設定的，不是 FSRS-4.5 的官方參數**，
//   也沒有用真實複習資料校準。所以產出的間隔不會與 Anki 一致。
//   目的不是複製 Anki，而是讓「學過就忘」被系統接住；日後可換成校準過的權重。
//
// 為什麼要有 S 與 D 兩個狀態：
//   S（stability）＝記憶能撐多久；D（difficulty）＝這張卡對你有多難。
//   只記「下次何時複習」的演算法（SM-2 的 ease factor）無法區分「這張卡本身難」
//   與「我這次狀態差」，複習幾次後間隔就會失真。

const FACTOR = 19 / 81;
const DECAY = -0.5;

/** 難度與間隔的邊界 */
export const LIMITS = {
  minStability: 0.1, // 天
  maxStability: 365 * 2,
  minDifficulty: 1,
  maxDifficulty: 10,
  maxIntervalDays: 365,
  targetRetention: 0.9,
};

export const WEIGHTS = {
  // 新卡的初始穩定度（天）
  initialStability: { 1: 0.4, 2: 1.0, 3: 2.0, 4: 4.2 },
  // 新卡的初始難度
  initialDifficulty: { 1: 7.4, 2: 6.2, 3: 5.0, 4: 3.8 },
  // 答對時穩定度的成長幅度
  successGain: 4.5,
  // 穩定度越大、成長越慢（避免成熟卡片的間隔爆炸）
  dampingHalf: 60,
  // 忘記時保留的穩定度比例
  lapseFactor: 0.15,
  difficultyStep: 0.8,
  difficultyRevert: 0.1,
  // 遺忘曲線的指數係數
  curveK: 1.5,
};

/**
 * 每個評分對應的「目標記住機率」。
 *
 * 這是本實作的關鍵設計：間隔不是「穩定度乘一個倍數」，而是
 * 「為了在 r 的機率下還記得，該隔幾天」——
 * 所以四個按鈕的差距是**可解釋**的（你要多高的把握？），
 * 而不是幾個百分點的雜訊。
 */
export const RETENTION_BY_GRADE = { 1: 0.97, 2: 0.95, 3: 0.9, 4: 0.85 };

export const GRADES = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

export const GRADE_LABELS = {
  1: "忘記了",
  2: "很吃力",
  3: "想起來了",
  4: "太簡單",
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** 經過 elapsedDays 之後還記得的機率 */
export function retrievability(elapsedDays, stability) {
  if (!(stability > 0)) return 0;
  const t = Math.max(0, elapsedDays);
  return Math.pow(1 + FACTOR * (t / stability), DECAY);
}

/** 要達到 retention 的機率，間隔該設幾天 */
export function intervalFor(stability, retention = LIMITS.targetRetention) {
  if (!(stability > 0)) return 0;
  const days = (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
  return clamp(days, 0.05, LIMITS.maxIntervalDays);
}

export const newCard = () => ({
  stability: 0,
  difficulty: 0,
  reps: 0,
  lapses: 0,
  lastReviewAt: null,
});

/**
 * 依評分更新卡片狀態。
 * @param {{stability:number,difficulty:number,reps:number,lapses:number,lastReviewAt:string|null}} card
 * @param {1|2|3|4} grade
 * @returns {{stability:number,difficulty:number,reps:number,lapses:number,lastReviewAt:string,intervalDays:number,dueAt:string,retrievability:number}}
 */
export function schedule(card, grade, now = new Date()) {
  const g = clamp(Math.round(grade), 1, 4);
  const isNew = !card || !card.reps || card.stability <= 0;

  let stability;
  let difficulty;
  let lapses = card?.lapses ?? 0;
  let retrievabilityBefore = 1;

  if (isNew) {
    stability = WEIGHTS.initialStability[g];
    difficulty = WEIGHTS.initialDifficulty[g];
    if (g === 1) lapses += 1;
  } else {
    const elapsedDays = card.lastReviewAt
      ? Math.max(0, (now.getTime() - new Date(card.lastReviewAt).getTime()) / 86400000)
      : 0;
    retrievabilityBefore = retrievability(elapsedDays, card.stability);

    if (g === 1) {
      // 忘記：穩定度大幅下降（但仍比完全重新學快）
      stability = card.stability * WEIGHTS.lapseFactor;
      lapses += 1;
    } else {
      // 答對：R 越低（越晚才複習）成長越多，但穩定度越大成長越慢
      const damping = 1 / (1 + card.stability / WEIGHTS.dampingHalf);
      const gain = WEIGHTS.successGain
        * ((11 - card.difficulty) / 10)
        * (Math.exp(WEIGHTS.curveK * (1 - retrievabilityBefore)) - 1)
        * damping;
      stability = card.stability * (1 + gain);
    }

    // 難度：這次的評分往哪邊推，再往初始難度做均值回歸（避免「難度地獄」）
    const pushed = card.difficulty + WEIGHTS.difficultyStep * (3 - g);
    difficulty = pushed * (1 - WEIGHTS.difficultyRevert)
      + WEIGHTS.initialDifficulty[3] * WEIGHTS.difficultyRevert;
  }

  stability = clamp(stability, LIMITS.minStability, LIMITS.maxStability);
  difficulty = clamp(difficulty, LIMITS.minDifficulty, LIMITS.maxDifficulty);

  // 間隔由「這個評分對應的目標記住機率」推導
  const rawInterval = clamp(intervalFor(stability, RETENTION_BY_GRADE[g]), 0.05, LIMITS.maxIntervalDays);
  // 去掉浮點尾數（1.9999999999999996 → 2），避免顯示與儲存出現噪音
  const intervalDays = Math.round(rawInterval * 100) / 100;
  const dueAt = new Date(now.getTime() + intervalDays * 86400000);

  return {
    stability,
    difficulty,
    reps: (card?.reps ?? 0) + 1,
    lapses,
    lastReviewAt: now.toISOString(),
    intervalDays,
    dueAt: dueAt.toISOString(),
    retrievability: retrievabilityBefore,
  };
}

/** 四個評分各自會把下次複習排到多久之後（給 UI 按鈕顯示） */
export function previewIntervals(card, now = new Date()) {
  const out = {};
  for (const g of [1, 2, 3, 4]) out[g] = schedule(card ?? newCard(), g, now).intervalDays;
  return out;
}

/** 人類可讀的間隔：「25 分鐘」「3 天」「2 個月」 */
export function formatInterval(days) {
  if (!(days > 0)) return "—";
  const minutes = days * 1440;
  if (minutes < 60) return `${Math.round(minutes)} 分鐘`;
  const hours = days * 24;
  if (hours < 36) return `${Math.round(hours)} 小時`;
  if (days < 30) return `${Math.round(days)} 天`;
  if (days < 365) return `${(days / 30).toFixed(days < 60 ? 1 : 0)} 個月`;
  return `${(days / 365).toFixed(1)} 年`;
}
