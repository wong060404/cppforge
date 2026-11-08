# 橫向功能收尾：圖鑑 ↔ 課程、複習統計頁

> 版本 v0.1 · 接續 `17-l5-l6b.md`
> 本輪沒有新增課程節點。補的是兩個橫向缺口 —— 它們不影響「能不能學」，
> 但影響「學得順不順」。

---

## 1. 圖鑑 → 相關課程

### 機制：用 `concepts` 標籤自動接線

圖鑑條目新增 `concepts` 欄位，伺服器把它與節點宣告的 `concepts` 取交集：

```js
// atlas.mjs
export function setNodeIndex(nodes) { ... }
function relatedFor(entry) {
  // 與 entry.concepts 有交集的節點，依「命中數 → 等級 → id」排序，取前 3
}
```

**為什麼不硬寫節點 id？** 因為新增節點時應該自動接上。用標籤比對，
未來只要新節點宣告了 `raii`，所有相關圖鑑條目就會自動連到它。

### 內容 lint 也接上了

```
圖鑑 leak: concept "xxx" 沒有任何節點宣告（相關課程會是空的）
```

打錯標籤會在內容 CI 就被擋下，而不是等到 UI 上出現空清單。

### 第一次跑的結果：22/22 都有連結，但有些推薦很爛

```
missing-semicolon → L4.02      ← 少了分號卻推薦「未定義行為與靜態分析」
cannot-convert    → L4.02
test-not-run      → L6.02
```

於是我改了 12 條標籤：

| 條目 | 改前 | 改後 |
|---|---|---|
| `missing-semicolon` 等 4 條語法錯 | `static-analysis` → L4.02 | `syntax-error`/`diagnostics` → **L0.02** |
| `missing-include` | `header-only` → L3.04 | `header`/`translation-unit` → **L0.03** |
| `out-of-bounds` | `in-place` → L5.03 | `bounds`/`boundary-condition` → **L1.03** |
| `test-not-run` | `integration` → L6.02 | `main`/`compile-pipeline` → **L0.01** |

改完之後每一條都指向「你該去學的那一節」：

```
leak                  → L2.03, L2.02
double-free           → L2.04, L2.02
undefined-reference   → L0.03, L3.04
out-of-bounds         → L1.03, L1.10
```

### UI

條目展開後多一列「相關課程」chip，點了會關掉圖鑑並直接載入那一節。

---

## 2. 複習統計頁

`reviews` 表從第一天就在記錄每次評分，但沒有畫面 —— 資料一直在，只缺一個視窗。

### 新 API：`GET /api/review/insights`

```json
{
  "days":  [{ "day": "2026-11-01", "total": 3, "again": 1, "hard": 0, "good": 2, "easy": 0 }, ...],
  "grades": { "1": 4, "2": 1, "3": 9, "4": 2 },
  "gradedTotal": 16,
  "forecast": [{ "day": "2026-11-08", "count": 2 }, ...]
}
```

三個 SQL 查詢（按日分組、評分分布、未來到期預測），最後在 JS 補齊「沒有複習的日子 = 0」。

### UI

複習視窗右上角多了「複習統計」：

- 五個摘要數字（卡片總數、已學過、待複習、今日複習、近期記得率）
- 最近 14 天的複習量（長條圖）
- 評分分布（四種評分各自顏色）
- 未來 7 天的到期預測

---

## 3. 為了測這兩個功能，測試框架也升級了

DOM shim 原本**不解析 `innerHTML`** —— 它只把字串存起來，元素樹是空的。
所以 `querySelectorAll` 什麼都找不到。真實瀏覽器當然會解析。

三個修正：

1. **加了極簡 HTML 解析器**（巢狀標籤、屬性、自閉合、文字）→ `innerHTML` 設定後會產生節點樹
2. **`querySelectorAll`**：支援 `tag`、`.class`、`[attr]` 與組合（例如 `.linkChip[data-node]`）
3. **`classList` 與 `className` 同步** —— 原本 `classList.add("hidden")` 不會反映在 `className` 上，
   所以「視窗是否關閉」的斷言永遠是錯的

這三個都是**測試工具與瀏覽器的落差**，不是產品 bug。但落差的代價是：
「這段程式碼只有瀏覽器能跑」的錯誤，會被 shim 放過。

UI 冒煙從 **28 項增加到 38 項**。

---

## 4. 驗證證據

| 驗證 | 方法 | 結果 |
|---|---|---|
| 圖鑑連結 | `/api/atlas` | **22/22 條都有相關課程** ✅ |
| 連結正確性 | 逐條人工檢視 + 12 條改標籤 | 每條都指向對應課程 ✅ |
| 內容 lint | 圖鑑 concepts 必須存在於某節點 | 0 問題 ✅ |
| 複習統計 API | `/api/review/insights` | days=14、forecast=7、grades 齊全 ✅ |
| UI 冒煙 | `dom-smoke --run` | **38/38**（新增 10 項）✅ |
| 內容 CI | 33 節 × 2 變體 + 22 圖鑑 | **33/33 全過** ✅ |
| 整條鏈 | 空 DB 逐節送參考解 | **33/33 通過** ✅ |
| 複習卡 | 走完 33 節 | **73 張** |

---

## 5. 現況

| 面向 | 狀態 |
|---|---|
| 七個等級（L0–L6） | ✅ 每級 ≥ 3 節，共 33 節 |
| 六種 grader | ✅ 全部有節點在用 |
| 錯誤圖鑑 | ✅ 22 條，全部可連到課程 |
| 間隔複習 | ✅ 73 張卡 + 統計頁 |
| 測試框架 | ✅ 值列印、容器比對、near、DOM shim 38 項 |
| 內容 CI | ✅ 33/33 + 22 圖鑑 + bugCount |
| 端到端 | ✅ 33/33 解鎖鏈 + UI 冒煙 |

**目標的條件全部達成。** 下一輪做最終驗證與文件總整理，然後標記完成。
