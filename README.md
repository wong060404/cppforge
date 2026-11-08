# CppForge

從零到職場級 C++ 的**訓練系統**（不是教程合集）。

> 狀態：**40 節課（L0–L6），前 4 節是基礎語法、含 CS2310 的核心概念**、錯誤圖鑑 22 條、間隔複習 93 張卡 + 統計頁；整條解鎖鏈以參考解驗證 40/40。
> **驗收清單：[`docs/19-acceptance.md`](docs/19-acceptance.md)** · **CS2310 概念對照：[`docs/23-cs2310-coverage.md`](docs/23-cs2310-coverage.md)** · **發佈到 GitHub：[`docs/24-publishing.md`](docs/24-publishing.md)**
> 進度與路線：**[框架完成進度](docs/12-progress.md)**
> 文件：**[框架](docs/00-framework.md)** · **[POC](docs/01-poc-report.md)** · **[M0](docs/02-m0.md)** · **[圖鑑](docs/03-m1.md)** · **[複習](docs/04-m1b.md)** · **[內容](docs/05-m1c.md)** · **[L2 開場](docs/06-m2.md)** · **[複製語意](docs/07-m2b.md)** · **[運算子](docs/08-m2c.md)** · **[測試框架](docs/09-harness.md)** · **[多型](docs/10-m2d.md)** · **[std::map](docs/11-l3a.md)**

---

## 立即開始使用

```powershell
git clone <你的 repo URL> cppforge
cd cppforge
node app/server/index.mjs
```

開啟 <http://127.0.0.1:4173>。

首次使用請點右上角 **「環境檢查」→「安裝工具鏈」**（65 MB，一次性，免安裝、可離線）。

> 若你的使用者目錄含中文（例如 `C:\Users\名稱\…`），MinGW 的 `ld.exe` 會無法連結。
> 這時要先指定純英文路徑：
> ```powershell
> $env:CPPFORGE_HOME = "C:\CppForge"
> node app/server/index.mjs
> ```

### 需求

| 項目 | 版本 | 說明 |
|---|---|---|
| Node.js | **24 以上** | 用到內建的 `node:sqlite` 與 `--experimental-strip-types` 以外的原生能力；不需要 npm 安裝任何東西 |
| 工具鏈 | w64devkit 2.11.0（GCC 16.2） | 由「環境檢查 → 安裝工具鏈」自動下載，SHA-256 已釘死 |

### 編輯器（可選）

介面預設用 Monaco 編輯器，但它約 27 MB 的建置產物**不進版控**。
沒有它也能跑 —— 會自動退回純文字 `textarea`（功能完全相同，只是沒有語法高亮）。

想拿到 Monaco：

```powershell
cd app/.vendor
npm install          # 依 package.json 安裝 monaco-editor
```

---

## 這是什麼

一套「有評分器、有先修關係、以交付可運行專案為終點」的 C++ 學習系統。
三條不可妥協的原則：

1. **真實工具鏈** —— 學員打的是真的 `g++`（GCC 16.2），看的是真的編譯器錯誤、真的 gdb backtrace。
2. **錯誤是一等公民** —— 「讀懂編譯器罵你什麼」本身是一門要練的技能（L0.02 就是純練這個）。
3. **能力可觀測** —— 每節都有可測量的通過條件，不是「看完了」。

在 LLM 時代的差異化：**目標是讓人變強，不是讓人交差**。
AI 在這裡是 reviewer / 教練 / 出題者，不是 solver。

### 已經做進去的功能

| 功能 | 說明 |
|---|---|
| 三欄學習介面 | 課程地圖 / 課文+即時練習卡 / 編輯器+評測結果（Monaco，載入失敗自動退回純文字） |
| 自動評測 | 6 種 grader：編譯、隱藏測試、輸出比對、記憶體安全、靜態規則、`-fanalyzer` |
| **錯誤圖鑑** | 22 條常見錯誤（症狀 → 為什麼 → 怎麼修 → 錯誤/正確對照），可用關鍵字搜尋；評測失敗時直接給對應條目；**每條都連到相關課程**（點了就跳過去） |
| **間隔複習（FSRS 形式）** | 概念卡（課程內容）× 錯誤卡（你踩過的錯）自動進排程；四個評分按鈕各自顯示下次間隔；右上角顯示待複習數；內建**複習統計頁**（14 天複習量、評分分布、未來 7 天到期預測） |
| 進度與獨立完成率 | 每節解鎖狀態、嘗試次數、**第一次提交就通過的比例**（`node:sqlite`） |
| 環境自我修復 | `doctor` 8 項檢查 + 一鍵安裝工具鏈（65 MB，SHA-256 釘死） |
| 記憶體診斷 | 洩漏與 **double free** 偵測（`operator new` 攔截），且能安全回報而不崩潰 |
| 測試訊息 | 失敗時自動印出**實際值**（型別有 `operator<<` 就用它；`enum` 印數值；沒有 `<<` 則優雅退化） |
| 內容 CI | 參考解必過、起始碼必「編譯過但測試敗」、先修無環、圖鑑欄位完整、卡片 q/a 齊全、宣稱的錯誤數可驗證、圖鑑標籤必須有對應課程 |

---

## 目前課程

| 等級 | 節點 | 內容 |
|---|---|---|
| **L0** 環境與心智模型 | 3 | 編譯四階段、讀懂編譯器訊息、標頭檔與連結 |
| **L1** 語言基礎 | 18 | 變數與型別、**字面值與 `sizeof`**、**浮點精度**、運算子、分支、函式、I/O 迴圈、整數除法、vector、控制流、const 與參考、**指標與 C 陣列**、`std::string`、optional、迴圈、`std::array`、struct、enum |
| **L2** 物件與資源 | 6 | 不變式、ctor/dtor、RAII、複製語意、運算子重載、多型 |
| **L3** 泛型與標準庫 | 4 | `std::map`、演算法與 lambda、erase-remove、template 與 concept |
| **L4** 工程化與正確性 | 3 | 例外安全、UB 與 `-fanalyzer`、錯誤處理策略 |
| **L5** 效能與併發 | 3 | 複雜度量測、thread/atomic、記憶體與容器選擇 |
| **L6** 職場整合 | 3 | 讀陌生程式碼、交付完整程式、程式碼審查 |

**L1 的順序刻意由淺入深**：先型別，再運算子，再分支，最後函式 ——
每一節都只用到前面教過的東西，第一次出現的語法都有完整課文。

共 **40 節**：每節都有課文、**本節任務**（介面契約 ＋ 怎麼做 ＋ 看提示）、
即時練習（全部選擇題）、自動評測、2–3 張複習卡。
整條鏈已用參考解逐節走完驗證（**40/40**），先修關係是單一線性路徑。
---|---|---|
| L0.01 | 編譯的四個階段與三種錯誤 | 編譯 + 輸出比對 |
| L0.02 | 讀懂編譯器的抱怨（起始碼故意編不過） | 編譯 + 隱藏測試 + 記憶體安全 |
| L0.03 | 標頭檔、多檔案與連結錯誤（含隊友的支援檔案） | 編譯 + 隱藏測試（連結階段才會失敗） |
| L1.01 | 從 stdin 讀資料：迴圈、累加、極值 | 編譯 + 輸出比對（3 組測資） |
| L1.02 | 整數除法與轉型 | 編譯 + 10 個隱藏測試 |
| L1.03 | vector 與 size_t：越界不是運氣 | 編譯 + 測試 + 邊界檢查 |
| L1.04 | 控制流與 off-by-one | 編譯 + 9 個隱藏測試 |
| L1.05 | const 與參考：改到呼叫者，還要改對 | 編譯 + 9 個隱藏測試 |
| L1.06 | std::string：拼接、計數、修剪 | 編譯 + 11 個隱藏測試 |
| L1.07 | 函式設計：「找不到」怎麼表達（optional） | 編譯 + 9 個隱藏測試 |
| L1.08 | 迴圈：for / while / do-while 各管什麼 | 編譯 + 11 個隱藏測試 |
| L1.09 | 固定大小陣列：`std::array` | 編譯 + 測試 + 邊界檢查 |
| L1.10 | struct：把相關的資料綁在一起 | 編譯 + 10 個隱藏測試 |
| L1.11 | enum class 與 switch：讓編譯器幫你抓漏 | 編譯 + 10 個隱藏測試 |
| **L2.01** | class 與不變式：讓不合法的狀態無法存在 | 編譯 + 10 個隱藏測試 |
| **L2.02** | 建構子與解構函式：誰配置，誰釋放 | 編譯 + 測試 + **洩漏檢查** |
| **L2.03** | RAII 與 unique_ptr：把 delete 刪掉 | 編譯 + 測試 + **洩漏檢查** |
| **L2.04** | 複製語意：深拷貝、淺拷貝與 rule of three | 編譯 + 測試 + **洩漏檢查** |
| **L2.05** | 運算子重載：`+=`、`==`、`operator<<` | 編譯 + 12 個隱藏測試 |
| **L2.06** | 繼承與多型：virtual、override、virtual 解構函式 | 編譯 + 11 個隱藏測試 + **洩漏檢查** |
| **L3.01** | `std::map`：查表、迭代、`operator[]` 的陷阱 | 編譯 + 12 個隱藏測試（容器比對會印元素） |
| **L3.02** | 迭代器與演算法：`count_if`、`max_element`、lambda | 編譯 + 11 個隱藏測試 |
| **L3.03** | erase-remove idiom：為什麼 `remove` 沒刪東西 | 編譯 + 10 個隱藏測試 |
| **L3.04** | 泛型入門：`template` 與 `concept`（**提交是 .hpp**） | 編譯 + 11 個隱藏測試 |
| **L4.01** | 例外安全：scope guard 與 stack unwinding | 編譯 + 9 個隱藏測試 + **洩漏檢查** |
| **L4.02** | 未定義行為與靜態分析：`-fanalyzer` 抓得到什麼、抓不到什麼 | 編譯 + 12 個測試 + **靜態分析** |
| **L4.03** | 錯誤處理策略：optional / 例外 / 錯誤碼三種契約 | 編譯 + 13 個測試 |
| **L5.01** | 複雜度與成本模型：用**操作次數**量效能（提交是 .hpp） | 編譯 + 10 個測試（含複雜度預算） |
| **L5.02** | 並發入門：thread、join、atomic、分工的邊界 | 編譯 + 10 個測試 + **必須用 atomic** 的靜態規則 |
| **L5.03** | 記憶體與容器選擇：`reserve`、就地修改、不用 list | 編譯 + 10 測試 + **必須 reserve** 的靜態規則 |
| **L6.01** | 讀陌生程式碼：用「同事的」stats/format 模組（反直覺語意） | 編譯 + 10 個測試 |
| **L6.02** | 交付完整程式：stdin → 聚合 → 排序報表 | 編譯 + **4 組輸出逐字比對** |
| **L6.03** | 程式碼審查：別人的環形緩衝區有三個 bug | 編譯 + 9 測試 + 洩漏檢查 |

共 33 節（L0×3、L1×11、L2×6、L3×4、L4×3、L5×3、L6×3）—— **七個等級每級至少 3 節**。
每節含：課文、可立即執行的練習、即時練習卡、自動評測、2–3 張複習卡。
整條鏈已用參考解逐節走完驗證（**33/33**），先修關係形成單一線性路徑。
完整路線與進度見 **[框架完成進度](docs/12-progress.md)**。

---

## 目錄結構

```
cppforge/
├─ app/                    ← 產品
│  ├─ server/               Node HTTP 服務、評測引擎、進度、環境檢查、錯誤圖鑑、複習排程
│  │  ├─ data/atlas.mjs     錯誤圖鑑資料（21 條）
│  │  ├─ srs.mjs            間隔複習排程（純函式，可單獨測試）
│  │  └─ review.mjs         卡片來源與佇列
│  ├─ web/                  三欄 UI（原生 ES module + Monaco）
│  ├─ content/              課程內容（純資料，可版控；含複習卡）
│  └─ test/
│     ├─ srs.test.mjs       排程演算法單元測試
│     ├─ atlas.test.mjs     圖鑑自檢
│     └─ dom-smoke.mjs       UI 冒煙測試（DOM shim 真的執行 app.js）
├─ lib/                    共用 C++ 資產：沙箱、洩漏檢查、測試框架、路徑解析
├─ poc/                    技術驗證（已封存，可重跑）
└─ docs/                   框架設計、POC 報告、M0 狀態、M1 兩個切片
```

---

## 開發者指令

```powershell
$env:CPPFORGE_HOME = "$env:TEMP\cppforge-home"   # 在受限環境下開發用

# 內容 CI：參考解必過、起始碼必「編譯過但測試敗」、先修無環、圖鑑欄位完整
node app/server/verify-content.mjs

# 排程演算法的單元測試（純函式：遺忘曲線、單調性、邊界）
node app/test/srs.test.mjs

# 錯誤圖鑑自檢（自我命中、歧義、真實訊息、正常輸出零命中）
node app/test/atlas.test.mjs

# UI 冒煙測試（需要服務已啟動；--run 會真的送出評測並走完複習流程）
node app/test/dom-smoke.mjs --run

# 環境能力探測
node poc/tools/probe.mjs

# 沙箱對抗測試（6 項）
node poc/runner/sandbox-tests.mjs
```

**兩道硬規則**：
1. 任何新節點，`node app/server/verify-content.mjs` 沒全綠就不能上線。
2. 任何 UI 改動，`node app/test/dom-smoke.mjs --run` 必須全過（它會真的執行 `app.js`）。

---

## 三個實測得到的硬約束

| 約束 | 原因 | 對策 |
|---|---|---|
| **工具鏈與建置目錄必須 ASCII** | MinGW 的 `ld.exe` 打不開含中文的路徑（連自己的 `crt2.o` 都找不到） | 安裝到 `%LOCALAPPDATA%\CppForge`；`doctor` 主動檢查 |
| **沒有 ASan / UBSan / TSan** | MinGW 不提供這些 runtime | 改用 `_GLIBCXX_DEBUG`、`-fanalyzer`、自製洩漏攔截、gdb |
| **不能用系統 HTTPS** | 本機 schannel 壞掉（`SEC_E_NO_CREDENTIALS`） | 下載走 Node 自帶 TLS |

---

## 授權與致謝

題目與程式碼自行撰寫。外部資源僅以連結引用（learncpp、cppreference、CppCon 等），不搬運內容。
工具鏈為 [w64devkit](https://github.com/skeeto/w64devkit)（公有領域宣告）；編輯器為 [Monaco](https://github.com/microsoft/monaco-editor)（MIT）。
