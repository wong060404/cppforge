# 完整功能審計（v0.1）

> 要求：「徹底檢查 cppforge 是否完整包含所有 function，發現有未完善的部分立即修復」

---

## 1. 怎麼「瀏覽」的（工具選擇與取捨）

要求是「安裝一個可以瀏覽網頁的 DSH 插件」。我查了 DSH 的插件系統與市集：

| 事實 | 影響 |
|---|---|
| DSH 有插件市集（`dshmarket`），社群目錄有 4200+ 插件 | 可安裝 |
| 目錄裡確實有瀏覽器類插件，例如 `chendefine/dsh-web-fetch-playwright`、`miqian-nomad/dsh-browser-playwright-codex` | 技術上可行 |
| **但安裝插件＝改動「我正跑在上面的」執行環境**：DSH 的啟動是全有全無，一個插件載不起來整個行程就結束，市集自己的 UI 也一起消失 | 風險：這次對話會直接中斷 |
| 市集自己的「AI fix」說明也明講：**若你發現自己就是正在跑這個 profile 的 harness，就不要改動 live composition** | 違反它自己的建議 |
| 這個沙箱封鎖 named pipe（`sh.exe: couldn't create signal pipe`），而 Playwright/Chromium 需要它 | 就算裝了，瀏覽器也很可能起不來 |
| `web_fetch` 工具對 `127.0.0.1` 有 SSRF 保護（`resolves to a non-public IP`） | 無法用它讀本機頁面 |

**所以改用等效手段**：用 `jsdom`（規格實作的 DOM）搭配 Node 的原生 `fetch`，
**真正載入 `index.html`、真正執行 `app.js`、真的打 HTTP**。
這比「手寫 DOM shim」嚴格得多 —— 之前 `querySelectorAll(...).find()` 的 bug 就是被 shim 放過的。

> 若你仍想裝插件：見 §6，那裡有指令與風險說明。

---

## 2. 四層審計（全部可重跑）

| 層 | 工具 | 項目 | 結果 |
|---|---|---|---|
| API 與靜態資源 | `app/test/audit-api.mjs`（新，零依賴） | 42 | ✅ 全過 |
| 內容完整性 | 本文件 §3 的腳本 | 15 | ✅ 全過 |
| 前端（真實 DOM） | `app/test/audit-dom.mjs`（新，需 jsdom） | 37 | ✅ 全過 |
| 原有測試 | 內容 CI / UI 冒煙 / SRS / 圖鑑 / 解鎖鏈 | 40 / 55 / — / 22 / 40 | ✅ 全過 |

### API 與靜態資源（42 項）
首頁與所有被引用的資源、`app.js`/`styles.css`/`md.js`、404、**路徑穿越（含編碼版）**、
`/api/health`、`/api/course`（7 級 40 節）、`/api/stats`、`/api/atlas`（22 條都有 symptom/fixes/bad/good/related）、
`/api/content/lint`、`/api/doctor`、**40 節的 node API 欄位**、複習三支端點、
評測的四種壞輸入、6 個並行請求的一致性。

### 前端（37 項）
載入 → 側邊欄 40 節/7 級 → **逐一開啟全部 40 節**（課文、任務卡、步驟、提示按鈕、練習題數與選項數、檔名、編輯器）
→ 提示逐條揭露與停用 → 練習點到正解 → 還原 → **真的按「執行」跑一次評測**
→ 錯誤圖鑑（開啟、搜尋過濾、無結果、節點連結、關閉）→ 環境檢查
→ 複習（翻面 → 4 個評分按鈕 → 真的評分 → 統計 → 回複習 → 關閉）
→ **全程沒有未捕捉的 JS 例外**。

### 內容完整性（15 項）
介面宣告 ↔ 起始碼 ↔ 參考解 ↔ 測試的交叉比對（38 節、60 個宣告）、
每節的教學元素（objectives ≥2 / hints ≥2 / steps ≥2 / drills ≥1 / lesson ≥300 字 / 有任務段落 / 有 grader）、
每節 ≥2 張複習卡、圖鑑欄位、壞輸入處理。

---

## 3. 找到的 6 個真問題（全部已修）

### ① 三節的「怎麼做」在 API 是空的
`/api/nodes/L0.01`、`L0.02`、`L0.03` 回傳 `steps: []` —— 因為步驟是**前端**依 grader 臨時生成的。
UI 看起來正常（前端補上了），但 **API 這個契約是殘缺的**：第二個客戶端、或直接用 API 的人拿不到指引。

**修法**：把 `defaultSteps()` 移到 `app/server/content.mjs`，`loadNode` 一律回傳有效步驟
（手寫的優先，沒有就依 grader 生成）。前端保留 fallback 當保險。

### ② 六節完全沒有複習卡
`L0.02`、`L0.03`、`L1.07`、`L1.10`、`L1.13`、`L1.14` 的 `cards` 是空的 ⇒ 這些主題**不會進到間隔複習**，
但 README 寫「每節 2–3 張複習卡」。`syncContentCards()` 只從 `node.cards` 建卡，所以是真缺口。

**修法**：補 12 張卡（每節 2 張，內容對應各節最容易忘的點）。
內容從 93 張 → **105 張**。

### ③ 壞掉的 JSON 讓伺服器回 500
`POST /api/nodes/:id/run` 與 `POST /api/review/:id` 都直接 `JSON.parse(...)`，
畸形 body 會拋 `SyntaxError` → 外層 catch → **500 INTERNAL**。客戶端 bug 不該變成伺服器錯誤。

**修法**：新增 `readJsonBody()` —— 壞 JSON → `400 BAD_JSON`、非 object/陣列 → `400`、
超過 2 MB → `413 PAYLOAD_TOO_LARGE`。

### ④ `code` 不是字串時被默默接受
`String(body.code ?? "")` 會把 `12345` 變成 `"12345"` 然後照樣評測（回 200）。
**修法**：型別檢查 → `400 BAD_CODE`。

### ⑤ 卡片 id 不是整數時回 404 而不是 400
`Number(decode(parts[2]))` → `NaN` → `gradeCard(NaN)` → `null` → 404 `CARD_NOT_FOUND`，
把「客戶端傳錯」誤報成「卡片不存在」。
**修法**：先驗證 `Number.isInteger` → `400 BAD_CARD_ID`。

### ⑥ 過長的程式碼錯誤碼語意不明
原本回 `{ error: "程式碼過長" }`（中文當 error code）。
**修法**：`413 CODE_TOO_LONG` + 中文 `message`。

### 順帶加的一道防線
內容 lint 新增：**每節至少 2 張複習卡、每張卡要有 q 與 a**。
未來新增節點若忘了寫卡，內容 CI 直接失敗 —— 缺口不會再默默回來。

---

## 4. 確認「本來就完整」的部分（沒有改）

- 40 節全部可開啟，課文／任務卡／步驟／提示／練習／編輯器都齊全
- 練習全部是可按的選項（347 個選項，答案一致、無重複、無 Markdown）
- 錯誤圖鑑 22 條都能連到課程（related 100% 命中），欄位完整
- 複習：排程、翻面、四級評分、統計頁、回複習都正常
- 評測：空程式碼、語法錯誤、不存在的節點、超大輸入都有明確處理（且錯誤輸出有上限）
- 靜態資源：路徑穿越（含 `%2e%2e` 編碼）被擋
- 並發：6 個並行請求結果一致

---

## 5. 怎麼重跑這些審計

```powershell
$env:CPPFORGE_HOME = "$env:TEMP\cppforge-home"
node app/server/index.mjs                  # 另開一個終端

node app/test/audit-api.mjs                # 42 項：API + 靜態資源 + 壞輸入
node app/test/dom-smoke.mjs --run          # 55 項：DOM 邏輯
npm install jsdom
node app/test/audit-dom.mjs --jsdom ./node_modules/jsdom   # 37 項：真實 DOM
node app/server/verify-content.mjs         # 40 節 × 2 變體 + 22 圖鑑
```

> `audit-dom.mjs` 需要「節點已解鎖」才能點開（未解鎖在側邊欄是 disabled）。
> 想一次檢查全部 40 節，先用參考解走完整條鏈（見 `docs/19-acceptance.md`）。

---

## 6. 如果你還是想裝瀏覽器插件

**指令**（在 DSH profile 目錄，不是我這個沙箱）：

```powershell
dsh plugin --profile desktop add <插件名>
```

或是更安全的路徑：**DSH 介面 → Settings → Plugin Market → 搜尋 `browser` 或 `playwright` → 一鍵安裝**。
市集會處理熱載入與必要的重啟，而且失敗時它有自己的「Adjust plugins」救援頁面。

**風險（我沒有替你執行，理由如下）**：

1. 我正跑在這個 profile 裡。新增 bundle 會改變 live composition；DSH 的啟動是 all-or-nothing，
   一個插件載入失敗會讓整個行程結束 —— 這次對話會直接斷掉，而且我救不回來自己。
2. 這個沙箱封鎖 named pipe，Playwright/Chromium 幾乎一定起不來（先前 EChrome 就是這樣失敗的）。
3. 瀏覽器插件通常只允許公開網址（SSRF 保護），本機 `127.0.0.1` 可能一樣被擋。

若你裝好之後要我用它，請確認：①DSH 還活著 ②插件能開 `http://127.0.0.1:4173` ③再叫我。
