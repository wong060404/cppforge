# 驗收清單：目標的每一項對應到什麼證據

> 版本 v1.0 · 2026-11
> 這份文件把目標陳述拆成可檢查的條目，每一條都有「怎麼驗、結果是什麼」。
> 全部在 2026-11 的同一台 Windows 機器（GCC 16.2 / Node 24）上實跑。

---

## 0. 目標陳述

> 依 `docs/00-framework.md` 把 L0–L6 七個等級全部建立成可學可評測的課程，
> 並補齊橫向功能（錯誤圖鑑、間隔複習、測試框架），使全站通過內容 CI 與端到端驗證。

拆成五個可檢查的條目：

| # | 條目 | 對應章節 |
|---|---|---|
| A | 七個等級都存在，且都有可學的節點 | §1 |
| B | 每一節「可學」（課文＋練習）且「可評測」（自動評分） | §2 |
| C | 錯誤圖鑑完整且可用 | §3 |
| D | 間隔複習完整且可用 | §4 |
| E | 測試框架與內容 CI 在運作 | §5 |
| F | 端到端：從空資料庫走完 33 節 | §6 |

---

## 1. 條目 A：七個等級都存在

```
$ node -e "…/api/course…"
L0(3) L1(11) L2(6) L3(4) L4(3) L5(3) L6(3)   ← 共 33 節、7 級
```

- 每級至少 3 節（L1 最多，11 節）
- 先修關係是**單一線性鏈**：從 `L0.01` 一路到 `L6.03`，內容 lint 驗證無環、無孤兒
- 每節的 `concepts` 標籤有實際用途（圖鑑連應用它）

| 等級 | 節點數 | 代表內容 |
|---|---|---|
| L0 環境與心智模型 | 3 | 編譯四階段、讀錯誤、連結 |
| L1 語言基礎 | 11 | 型別、控制流、函式、容器、字串、optional、陣列、struct、enum |
| L2 物件與資源 | 6 | 不變式、RAII、複製語意、運算子、多型 |
| L3 泛型與標準庫 | 4 | map、演算法、erase-remove、模板與 concept |
| L4 工程化與正確性 | 3 | 例外安全、UB 與靜態分析、錯誤處理策略 |
| L5 效能與併發 | 3 | 複雜度量測、thread/atomic、記憶體與容器 |
| L6 職場整合 | 3 | 讀陌生程式碼、交付完整程式、程式碼審查 |

---

## 2. 條目 B：每節「可學」且「可評測」

每一節都必須有六件東西（內容 lint 強制）：

```
node.json          題目定義
lesson.md          課文（含學習目標、即時練習卡）
starter.cpp        起始碼（必須能編譯，但測試會失敗）
tests.cpp          隱藏測試（學員看不到）
interface/*.hpp    不可修改的介面（部分節點）
.meta/solution.cpp 參考解
```

**可評測**的部分由六種 grader 負責，而且每一種都真的有節點在用：

| grader | 用途 | 用在 |
|---|---|---|
| `compile` | `-Wall -Wextra -Wpedantic -Werror` | 全部 33 節 |
| `unit_test` | 隱藏測試 + 失敗訊息帶實際值 | 30 節 |
| `io_match` | stdin→stdout 逐字比對 | L0.01、L1.01、L6.02 |
| `runtime_safety` | 洩漏 / double free / 崩潰 | L0.02、L1.03、L1.09、L2.02–L2.04、L4.01、L6.03 |
| `static_rules` | 禁用寫法 + **必須寫法** | L5.02（必須 atomic）、L5.03（必須 reserve） |
| `analyzer` | `-fanalyzer`（CWE 報告） | L4.02 |

---

## 3. 條目 C：錯誤圖鑑

```
GET /api/atlas → 22 條，22 條有「相關課程」
```

- 每條含：階段（前置處理/編譯/連結/執行期）、症狀、為什麼、怎麼修、錯誤/正確對照
- **19 個真實編譯器/執行期訊息**被用來自我測試（`atlas.test.mjs`），零誤報
- 評測失敗時自動比對，直接給對應條目（UI 上顯示為 chip）
- **新增**：每條連到 2–3 節相關課程（點擊直接跳過去）

連結怎麼來的：圖鑑條目的 `concepts` 與節點宣告的 `concepts` 取交集。
新增節點會自動接上，不需要維護對照表；打錯標籤會被內容 lint 擋下。

---

## 4. 條目 D：間隔複習

```
GET /api/review/stats    → { total: 3, due: 3, learned: 0, … }
GET /api/review/insights → { days: [14 天], grades: {1..4}, forecast: [7 天] }
```

- 卡片來源兩種：課程的**概念卡**（每節 2–3 張）＋ 你踩過的錯變成的**錯誤卡**
- 排程是 FSRS **形式**（穩定性/難度狀態 + 四級評分 + 目標留存率反推間隔）
- 四個評分按鈕各自顯示「下次間隔」，不是同一個數字
- 第三輪就修掉兩個模型設計錯誤（穩定度不成長、四級評分間隔幾乎相同）
- **新增**：統計頁（14 天複習量、評分分布、未來 7 天到期預測）

**誠實的限制**：權重是手動設定的，**不是**官方 FSRS-4.5 參數，間隔不會與 Anki 一致。

---

## 5. 條目 E：測試框架與內容 CI

### 測試框架（`lib/cf_test.hpp`）

- 失敗時印出**實際值**（型別有 `operator<<` 就用它；`enum` 印數值；沒有則優雅退化）
- `CF_EXPECT_EQ` / `CF_EXPECT_NEAR` / `CF_EXPECT_THROW` / `CF_EXPECT_EQ_RANGE`（容器會展開成 `[a, b, c]`）
- 在 `-Wall -Wextra -Wpedantic -Werror -Wshadow -Wconversion` 下無警告

### 內容 CI（`app/server/verify-content.mjs`）

每一節都要通過七道關卡：

1. 參考解必須全過
2. 起始碼必須「編譯過但測試失敗」（`starterFailsCompile` 的節點例外）
3. 失敗訊號數 ≥ 課文宣稱的錯誤數（`bugCount`）
4. 先修 DAG 無環、無孤兒
5. 圖鑑欄位完整、標籤有對應課程
6. 每張複習卡有問題與答案
7. `io.cases` 每組都有期望輸出

執行結果：**33 節 × 2 變體 + 22 圖鑑，0 問題。**

---

## 6. 條目 F：端到端

| 驗證 | 指令 | 結果 |
|---|---|---|
| 整條解鎖鏈 | 空 DB，逐節送參考解 | **33/33 通過** |
| UI 冒煙 | `node app/test/dom-smoke.mjs --run`（真的執行 app.js） | **38/38** |
| API + 靜態資源 | 23 項檢查（health/course/atlas/review/insights/doctor/lint/nodes/vendor） | **23/23** |
| 冷啟動 | 刪 DB → 啟動 | 只解鎖 L0.01、同步 3 張概念卡 |
| 排程單元測試 | `node app/test/srs.test.mjs` | 全過 |
| 圖鑑自檢 | `node app/test/atlas.test.mjs` | 全過（19 個真實訊息） |

**端到端耗時**：33 節完整走完約 2 分鐘（單節 1.5–6.5 秒）。

---

## 7. 已知限制（不隱藏）

| 限制 | 影響 | 為什麼 |
|---|---|---|
| 排程權重未校準 | 間隔與 Anki 不同 | 需要真實使用資料才能擬合 |
| 沒有 ASan/UBSan/TSan | 記憶體與併發錯誤只能靠自製檢查與設計 | 這台機器的 MinGW 沒有這些 runtime（POC 實測） |
| 沙箱無網路/檔案限制 | 只擋「手滑」，不擋惡意程式 | 需要 WFP/AppContainer，超出範圍 |
| 無法目視 UI | 版面/CSS 未經人眼確認 | 環境中的瀏覽器無法啟動（no named pipes） |
| 33 節 vs 框架的 227 節 | 骨架完整，深度不足 | 每級 3–11 節是「可學完的骨架」 |
| 單一使用者 | 無多帳號/佇列 | 設計如此（本機工具） |

---

## 8. 怎麼重跑全部驗證

```powershell
cd cppforge
$env:CPPFORGE_HOME = Join-Path $env:TEMP 'cppforge-home'

node app/server/verify-content.mjs      # 內容 CI（33 節）
node app/test/srs.test.mjs              # 排程
node app/test/atlas.test.mjs            # 圖鑑自檢
node app/test/dom-smoke.mjs --run       # UI 冒煙（38 項）

node app/server/index.mjs               # 啟動服務 → http://127.0.0.1:4173
```
