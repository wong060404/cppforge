# CppForge — 從零到職場級 C++ 的訓練系統
## 整體框架設計 v0.2（已依 POC 實測修正）

> 代號 `CppForge`（可改）。本文談「框架與取捨」，不含最終 UI 稿與題目全文。
> 狀態：v0.2 —— 5 個決策問題已回答（§12），技術 POC 已完成（見 `01-poc-report.md`），
> 其中 4 個原始假設被實測推翻並已修正（§7.1.1、§7.3、§7.4、§11）。

---

## 1. 一句話定位

**這不是「C++ 教程」，而是一套有評分器、有先修關係、有遺忘曲線、以「交付可運行專案」為終點的訓練系統。**

三條不可妥協的設計原則：

| 原則 | 含義 | 反面教材 |
|---|---|---|
| **真實工具鏈** | 學員打的是真的 `g++`/`clang`/MSVC，看的是真的 linker error、真的 ASan 報告 | 瀏覽器裡的假直譯器，永遠遇不到 ODR、ABI、連結錯誤 |
| **錯誤是一等公民** | 「讀懂編譯器罵你什麼」本身是一門要練的技能，佔 20% 課時 | 只給通過/不通過，學員永遠卡在同一類錯誤 |
| **能力可觀測** | 每個節點有可測量的通過條件，不是「看完了」 | 進度條 = 影片看完，能力 = 0 |

在 LLM 時代的差異化：**產品的目標是讓人變強，不是讓人交差。**
內建「先自己寫 → 再看 AI 對照 → 再自己改」的三段流程，並統計「獨立完成率」（首次提交就通過的比例）。
AI 在本產品裡的角色是 **reviewer / 教練 / 出題者**，不是 solver。

---

## 2. 為什麼現有工具不夠（對照與取捨）

| 參考對象 | 借鑑什麼 | 不照抄什麼 |
|---|---|---|
| **[Exercism](https://exercism.org/docs/building/tracks/config-json)** | `concepts` + `prerequisites` 的概念圖、`test_runner` 的 stdin/stdout JSON 契約、mentoring 模式 | 練習偏「語言特性小題」，缺少工程鏈（CMake、測試、效能、併發） |
| **[learncpp.com](https://www.learncpp.com)** | 章節排序（業界公認最紮實的入門順序）、小而密的練習 | 純文字 + 無自動批改 + 無進度模型 |
| **LeetCode / Codewars** | 即時回饋、streak、排行榜的心理機制 | 算法競賽化 ≠ 工程能力；C++ 在那裡只是「比較快的 Python」 |
| **Codecademy / Boot.dev / JetBrains Academy** | 引導式互動、專案制、關卡感 | 沙箱化過度，離開平台就不會用真工具 |
| **[Compiler Explorer](https://godbolt.org) / [C++ Insights](https://cppinsights.io)** | 「讓學員看見編譯器產出」這個教學視角 | 是工具，不是課程 |
| **[Judge0](https://github.com/judge0/judge0) / [DOMjudge](https://www.domjudge.org) / [codegrinder](https://pkg.go.dev/github.com/russross/codegrinder)** | 沙箱執行、多語言 runner、資源限制 | 面向競賽/作業，不面向「漸進式技能樹」 |
| **[Ursinus WebIDE](https://github.com/BillJr99/Ursinus-WebIDE)** | 「瀏覽器端自動批改 + 免安裝」的可行性驗證 | 教學深度不足 |
| **[C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/)** + `clang-tidy` | 把「什麼是好 C++」變成可執行的規則 → 直接當 lint grader | 規則太多，需分級成課程 |
| **[modern-cpp-tutorial](https://github.com/changkun/modern-cpp-tutorial) / [CPlusPlusThings](https://github.com/Light-City/CPlusPlusThings)** | 現代 C++（11/14/17/20）特性清單、中文語境 | 是「讀物」，不是「訓練」 |
| **[project-based-learning](https://github.com/practical-tutorials/project-based-learning) / [build-your-own-x](https://github.com/codecrafters-io/build-your-own-x)** | Capstone 專案題材庫 | 無評分、無階梯 |
| **[FSRS](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler)** | 間隔重複排程演算法（比 SM-2 準） | Anki 式的「卡片」對程式設計太淺，需改造 |

**空白地帶（我們的機會）**：
`Exercism 的概念圖` × `learncpp 的深度` × `真工具鏈的評分器` × `工程化鏈路（CMake/test/sanitizer/profiler）` × `專案交付`。
目前 GitHub 上**沒有**一個把這五件事串起來的開源專案 —— 這是藍海，也是難點（內容量）。

---

## 3. 「職場級別」的定義：能力矩陣

沒有這個定義，「掌握」是空話。以下 12 項能力，每項都給出**可觀測證據**，作為畢業標準（L6 出口）。

| # | 能力 | 可觀測證據（通過 = 能做到） |
|---|---|---|
| 1 | 語言核心 | 能解釋 `std::move` 為什麼不移動任何東西；能寫出正確的 copy/move ctor + assignment（rule of 5） |
| 2 | 資源管理 | 全程無裸 `new/delete`；能寫 exception-safe 的程式碼（strong/basic guarantee） |
| 3 | 泛型 | 能用 concepts 約束模板；能讀懂 STL 的 `iterator_traits` 錯誤訊息 |
| 4 | STL 與演算法 | 看到迴圈就想到 `ranges`；能說出容器選擇的時間/記憶體/迭代器失效代價 |
| 5 | 正確性 | 給定程式碼能指出 UB；能用 ASan/UBSan/TSan 定位問題 |
| 6 | 測試 | 能為既有程式碼補測試到 80% 分支覆蓋；知道何時用 mock/fake |
| 7 | 建置與依賴 | 從零寫 CMakeLists（target-based、無 `file(GLOB)`）；用 vcpkg/Conan 管理依賴 |
| 8 | 效能 | 能用 profiler 找熱點；能解釋 cache miss 對效能的量級影響；會寫 microbenchmark |
| 9 | 併發 | 能寫出無 data race 的多執行緒程式；理解 memory order 至少到 acquire/release |
| 10 | 除錯 | 能從 core dump / stack trace / sanitizer 報告反推根因；會用 debugger 而非 `printf` |
| 11 | 工程協作 | 會 code review（給出可執行建議）；懂 CI、靜態分析、格式化、版本控制習慣 |
| 12 | 架構與閱讀 | 能在 1 萬行陌生 codebase 中定位功能並安全修改；能做介面設計與取捨 |

> 這 12 項 → 映射成 6 個等級的「能力雷達圖」，是產品的核心儀表板。

---

## 4. 學習模型（為什麼這樣設計）

| 機制 | 做法 | 依據 |
|---|---|---|
| **精熟制** | 節點通過門檻 80%，未達標不鎖下一節（但可「跳級考」） | Mastery learning |
| **示範 → 淡出** | 每個概念：worked example（完整解說）→ completion problem（挖空）→ 獨立題 → 遷移題（換情境） | Cognitive load theory / fading |
| **提取練習** | 每節 3–6 題「預測輸出」「找 bug」「填空」，而非選擇題為主 | Retrieval practice |
| **間隔重複** | 概念卡 + **錯誤模式卡**（你犯過的錯）進 FSRS 排程，每日 10 分鐘複習 | FSRS |
| **交錯練習** | 每週「混合測驗」抽前面等級的題，防止「當場會、一週後忘」 | Interleaving |
| **錯誤驅動** | 獨立的「錯誤圖鑑」模組：200+ 真實編譯器/連結器/執行期錯誤 → 成因 → 修法 | Error-based learning |
| **專案閘門** | 每 2 級一個交付專案，用 rubric + 自動測試 + （可選）人工/LLM 評審 | Project-based |
| **輸出檢驗** | 「費曼模式」：用自己的話解釋 → LLM 扮演面試官追問 3 層 | Explain-back |

**反模式（明確不做）**：無腦刷題、看影片算完成、複製貼上通過、只考語法細節。

---

## 5. 課程地圖（DAG）

### 5.1 主幹 7 級

```
L0 環境與心智模型 (基礎設施)
 │   工具鏈、編譯四階段、IDE/CLI、debugger 第一次、git 第一次
 ▼
L1 語言基礎 (程序式思維)
 │   型別/運算子/控制流/函式/陣列/vector/string/IO/reference/const
 ▼
L2 物件與資源 (RAII 是 C++ 的靈魂)
 │   class/ctor/dtor/copy/move/運算子重載/繼承/多型/智慧指標
 ▼
L3 泛型與標準庫 (從「會寫」到「寫得慣用」)
 │   template/concepts/lambda/iterator/algorithms/ranges/容器選型/複雜度
 ▼
L4 工程化與正確性 (從「能跑」到「敢上線」)
 │   UB/例外安全/錯誤處理/單元測試/CMake/套件管理/靜態分析/CI/code review
 ▼
L5 效能與併發 (從「能上線」到「能扛」)
 │   profiling/cache/記憶體佈局/move 實戰/thread/mutex/atomic/memory model/benchmark
 ▼
L6 職場整合 (從「會寫」到「能交付」)
    大型 codebase 導讀/架構與設計模式/API·ABI/跨平台/生產除錯/capstone/模擬面試
```

### 5.2 專項分支（L5 之後分岔）

| 分支 | 增量內容 |
|---|---|
| **後端/系統** | 網路程式設計（epoll/IOCP）、協定、資料庫驅動、服務可觀測性、gRPC |
| **嵌入式/韌體** | 無 heap、volatile、中斷、RTOS、靜態分析 MISRA、交叉編譯 |
| **遊戲/圖形** | ECS、math/linear algebra、GPU 管線、熱重載、frame budget |
| **HPC/低延遲** | SIMD、cache 友好資料結構、lock-free、NUMA、數值穩定性 |

> 預設只做「通用後端/系統」一條完整分支，其餘留接口（見第 11 節 Q4）。

### 5.3 規模估算（誠實版）

| 等級 | 節點數 | 練習/實驗 | 預估學員投入 | 專案 |
|---|---|---|---|---|
| L0 | 8 | 10 | 4 h | — |
| L1 | 40 | 90 | 28 h | 1（CLI 小工具） |
| L2 | 45 | 100 | 35 h | 1（簡易容器/資源管理庫） |
| L3 | 40 | 95 | 32 h | 1（泛型資料結構庫） |
| L4 | 38 | 85 | 30 h | 1（有測試與 CI 的函式庫） |
| L5 | 34 | 75 | 30 h | 1（多執行緒工作佇列） |
| L6 | 22 | 45 | 40 h | 1（Capstone：可交付專案） |
| **合計** | **~227** | **~500** | **~200 h** | **7** |

`200 小時` ≈ 每週 8 小時 × 6 個月。這是「有別語言經驗者」的路徑；純零基礎約 1.5 倍。

> ⚠️ 227 個節點是可維護的上限。**內容生產是本專案最大的風險**（第 9 節）。

### 5.4 節點依賴圖（L2 局部示例）

```
            ┌─ class-basics ──── ctor-dtor ──── raii ──── smart-ptr-unique
reference ──┤                        │                    │
const ──────┘                        ├─ copy-semantics ───┴─ move-semantics ── rule-of-five
                                     ├─ operator-overload
                                     └─ inheritance ─── polymorphism ─── virtual-dtor ── interface-design
```
*（每個節點 = 一個可獨立通過的 `slug`，與 Exercism 的 concept exercise 同構，但多掛「實驗/專案/錯誤卡」。）*

---

## 6. 節點規格（內容 Schema）

一切內容皆是**純資料（git 版本控制）**，由 CLI 驗證，由 App 渲染。這是能規模化的關鍵。

```yaml
# content/levels/L2/raii/exercise.yaml
id: L2.raii                      # 穩定 ID，永不變
title: RAII：讓解構函式替你收拾殘局
level: 2
prerequisites: [L2.ctor-dtor, L1.reference, L1.const]
concepts: [raii, scope-lifetime, exception-safety-basic]   # 對應 FSRS 卡與雷達圖
est_minutes: 45

objectives:                      # 必須可被測量
  - 能說明物件在哪些時機被解構（正常返回 / 拋例外 / 提前 return）
  - 能改寫「手動 open/close」為 RAII 包裝且通過例外測試
  - 能辨識 3 種會導致資源洩漏的寫法

material:
  read:   [ { title: C++ Core Guidelines R.1/R.5, url: ... } ]
  watch:  [ { title: CppCon Back to Basics: RAII, url: ... } ]
  ref:    [ { title: cppreference: Destructors, url: ... } ]

drills:                          # 3–6 題，全部可自動判分
  - kind: predict-output
    prompt: 下列程式碼印出什麼？   # 貼 code
    answer: "dtor 3 次，順序為 c b a"
  - kind: spot-the-bug
    code_file: drills/leak1.cpp   # 應有 1 個資源洩漏路徑
    expected: ["missing-close-on-early-return"]
  - kind: fill-in
    ...

labs:                            # 1–2 個，有 starter + hidden tests + rubric
  - id: lab-file-guard
    prompt: 實作 FileGuard，使 fd 在解構時關閉
    starter: labs/file-guard/starter/          # 可編譯但測試失敗
    solution: labs/file-guard/.meta/solution/  # 參考解（CI 用，學員不可見）
    tests: labs/file-guard/tests/              # Catch2 + 隱藏測資
    graders: [unit_test, asan, clang_tidy]
    rubric:
      - 解構函式有 noexcept
      - 禁止手動 close()
      - 通過 copy 禁用檢查（AST）

review:                          # 讀別人 code、給建議
  code_file: reviews/legacy-db.cpp
  expected_findings: [raw-new-leak, missing-virtual-dtor, exception-in-dtor]

cards:                           # 進入 FSRS
  - q: 為什麼解構函式預設 noexcept？
    a: ...
  - q: 你上次在 lab-file-guard 犯的錯是什麼？    # 錯誤模式卡，由系統自動生成

exit_criteria:
  drills: 0.8                    # 正確率
  labs: all_pass                 # 含 hidden tests + sanitizer
  review: 0.7                    # 找到 >=70% 的預期問題
```

**設計要點**
- `starter` 必須**編譯成功但測試失敗**（否則學員一開局就被編譯錯誤淹沒）；少數「修編譯錯誤」型練習例外。
- 每個 exercise 都必須有 `solution`，否則 CI 拒絕合併（見第 8 節）。
- `concepts` 是跨節點的共享鍵 → 驅動能力雷達圖與複習卡。

---

## 7. 評測引擎（本產品的技術心臟）

### 7.1 七種 Grader（可組合）

| Grader | 做什麼 | 技術（**已依 POC 實測修正**） |
|---|---|---|
| `compile_only` | 只要求「無警告通過編譯」——訓練把 warning 當錯 | `-Wall -Wextra -Wpedantic -Werror` ✅ |
| `unit_test` | 跑測試框架，含**隱藏測資** | 自製 `cf_test.hpp`（零依賴）✅；Catch2 留作進階 |
| `io_match` | stdin/stdout 比對，容忍空白/trailing | 正規化後 diff |
| `runtime_safety` | 洩漏 / 邊界 / 崩潰 | `_GLIBCXX_DEBUG` + `_GLIBCXX_ASSERTIONS` + 自製 `operator new` 攔截 ✅（**ASan 不可用**） |
| `static_rules` | 禁用裸 `new`、要求 `const`… | 自訂規則 ✅ + `g++ -fanalyzer`（含 CWE 標記）✅；clang-tidy 不在套件內 |
| `performance` | 耗時/記憶體門檻、複雜度縮放偵測 | `-O2` + 多次取中位數（噪音需實測校準） |
| `explain_review` | 用自己的話解釋 / code review 品質 | rubric 化 LLM 評分 + 固定測資校準 |

> **關鍵取捨**：`performance` 與 `explain_review` 天生不穩，**只做加分項，不做擋門條件**，避免學員被噪音勸退。

### 7.1.1 實測後的診斷能力矩陣（Windows / MinGW）

| 能力 | 手段 | 可用 |
|---|---|---|
| vector 越界、迭代器失效 | `-D_GLIBCXX_DEBUG` | ✅ |
| 容器邊界（可配 `-O2`） | `-D_GLIBCXX_ASSERTIONS` | ✅ |
| 堆疊溢位 | `-fstack-protector-all` | ✅ |
| 記憶體洩漏（動態） | 自製 `operator new/delete` 攔截 | ✅ |
| 資源洩漏（靜態） | `g++ -fanalyzer` | ✅ |
| 崩潰 backtrace | `gdb -batch -ex run -ex bt` | ✅ |
| use-after-free（內容損毀） | ASan | ❌ 不支援 |
| 有號整數溢位 | UBSan | ❌ 不支援 |
| data race | TSan | ❌ 不支援（MinGW 無 `-ltsan`） |
| LTO / C++20 modules | — | ❌ 不支援 |

**因此 L4/L5 的教學策略改為：**
1. 主線（零安裝）＝「靠推理找 UB」＋「用上面 6 種真的能用的工具驗證」。這更接近職場真相——多數 Windows 開發機也沒 sanitizer。
2. 進階（可選）＝`doctor` 偵測到 WSL2 時解鎖「無菌模式」（clang + ASan/UBSan/TSan + valgrind）。
3. 面試向＝L6 用「找出這段 code 的 UB」題型補足，不依賴工具。

### 7.2 Runner 契約（刻意模仿 Exercism，好處：可替換、可 CI、可社群貢獻）

```
POST /run  { exercise_id, files[], graders[] }   --stdin/stdout JSON，單向-->

{
  "status": "ok",
  "results": [
    { "grader": "unit_test", "passed": 12, "failed": 1,
      "output": "...", "duration_ms": 830 },
    { "grader": "asan", "passed": false,
      "report": "heap-use-after-free at solution.cpp:42" }
  ],
  "diagnostics": [ { "severity": "error", "file": "solution.cpp", "line": 42, "message": "..." } ]
}
```
任何語言/任何沙箱只要能講這個協定就能驅動 UI → 未來可接遠端 judge、Docker、或雲端。

### 7.3 沙箱（已實作並驗證）

本機執行不可信程式碼是必須的（學員會寫 `while(true)`、會 `vector<int> v(1e9)`）。
**不是「計畫」——POC 已經寫出來並通過 6 項對抗測試**（見 `docs/01-poc-report.md` §4）。

| 情境 | 機制 | POC 實測 |
|---|---|---|
| 無窮迴圈 | 牆鐘逾時 → `TerminateJobObject` | ✅ 3016ms 終止整棵樹 |
| 記憶體炸彈 | `ProcessMemoryLimit` | ✅ 企圖吃 6.4GB → 峰值 225MB 即失敗 |
| 輸出洪水 | 讀取執行緒限流 + 丟棄 | ✅ 40MB → 落地 1MB |
| 孤兒行程 | `KILL_ON_JOB_CLOSE` | ✅ 父死子清 |
| 行程爆量 | `ActiveProcessLimit` | ✅ 10 個只成功 3 個 |
| UI 干擾 | `JOBOBJECT_UILIMIT_*` | ✅ 禁桌面/剪貼簿/關機 |

實作要點：`CREATE_SUSPENDED` → 加入 job → `ResumeThread`（避免起跑競態）；
上限必須做在**讀取端**而非事後檢查檔案大小。

**尚缺（列入 M0 後強化）**：網路封鎖（WFP）、檔案寫入範圍（低完整性權杖 + ACL）、
多租戶隔離。目前等級足以擋「學員手滑」，但不足以當雲端 judge。

### 7.4 環境自我修復（很多人會在這一步放棄）

`cppforge doctor`（**POC 已做出 `path.mjs` + `probe.mjs` 原型**）：
1. **先檢查家目錄是否純 ASCII** —— 非 ASCII 直接拒絕並說明原因（`ld.exe` 無法處理）；
2. 偵測有無 `g++`/`clang++`/`cl`；
3. 沒有 → 一鍵下載 **[w64devkit](https://github.com/skeeto/w64devkit)**（65.6 MB，解壓 29 秒，內含 g++/gdb/make/**cmake/ninja/ctest/ccache/gcov**）；
4. 驗證 `-std=c++20`、`_GLIBCXX_DEBUG`、`-fanalyzer`、gdb backtrace（**不要驗 ASan，會失敗**）；
5. 產生 `report.json` 給使用者看（也方便除錯）。

> 安裝位置預設 `%LOCALAPPDATA%\CppForge`，**絕不放在含中文的路徑**。這是本專案最容易被忽略的坑（見 POC 報告 §6.1）。
> 下載不可依賴系統 HTTPS：本機 schannel 已壞（`SEC_E_NO_CREDENTIALS`），要用自帶 TLS。

---

## 8. 系統架構

### 8.1 分層

```
┌──────────────────────────────────────────────────────────┐
│  app/        Web UI（瀏覽器）                              │
│   課程地圖 · 學習面板 · Monaco 編輯器 · xterm 終端 · 雷達圖  │
├──────────────────────────────────────────────────────────┤
│  server/     本地服務（Node/TS）                           │
│   /run 評測 · /progress 進度 · /fs 檔案 · /ai 教練代理      │
│   └─ runner/  g++ 驅動 · 沙箱 · grader 管線                │
├──────────────────────────────────────────────────────────┤
│  content/    純資料（git）  schema/  L0..L6/  reviews/     │
│  authoring/  CLI：new-exercise · verify · publish · stats   │
├──────────────────────────────────────────────────────────┤
│  store/      SQLite（進度、嘗試、卡片、統計）              │
└──────────────────────────────────────────────────────────┘
```

### 8.2 技術選型（建議 + 理由）

| 層 | 選擇 | 理由 | 替代方案 |
|---|---|---|---|
| UI | React + Vite + TypeScript | 迭代最快；Monaco/xterm 生態成熟 | Svelte（更輕） |
| 編輯器 | Monaco | 就是 VS Code 的引擎，C++ 語法/錯誤標記免費 | CodeMirror 6（更小） |
| 終端 | xterm.js + node-pty | 未來可開真 shell 教學（`gdb` 互動） | 純輸出面板（MVP 夠用） |
| 服務 | Node 20 + Fastify | 你機器已有 Node；與 UI 同語言 | Rust/Axum（更快但慢開發） |
| 進度 | SQLite (better-sqlite3) | 單機、零設定、可備份成一個檔案 | JSON 檔（MVP 夠用） |
| 打包 | 先「本地 web」→ 後 Tauri | 先用瀏覽器驗證，再封裝成 .exe | Electron（肥） |
| 內容 | YAML + Markdown + git | 可 review、可 diff、可社群貢獻 | DB（難協作） |

> **建議先做「本地 web 服務 + 瀏覽器」**：開發迭代最快，而且和你現在的 DSH GUI 工作流一致；等內容穩定再包成桌面 app（Tauri 只有幾 MB）。

### 8.3 資料模型（最小集）

```sql
users(id, name, created_at, placement_result)
nodes(id, level, title, est_minutes)            -- 從 content 同步
progress(user_id, node_id, status, best_score, mastered_at)
attempts(id, user_id, node_id, kind, code, results_json, created_at, duration_ms)
cards(id, user_id, concept_id, front, back, stability, difficulty, due_at)  -- FSRS
streaks(user_id, day, minutes)
```

### 8.4 內容 CI（沒有這個，227 個節點必然爛掉）

每個 PR / 每次內容變更都跑：
1. Schema 驗證（YAML 符合 §6）。
2. **參考解必須通過所有 grader**（含 sanitizer）。
3. **空實作 / starter 必須「編譯成功但測試失敗」**。
4. `prerequisites` 無環、無孤兒（DAG 檢查）。
5. 所有 `concepts` 都在 concept 詞典裡。
6. 連結檢查（外部資源 404）。
7. 每個節點的估計時間與題數在合理範圍。

> 這一步是**自動化內容生產**的前提：我可以用 LLM 大量生成草稿，但只有通過 CI 的才進主線。

---

## 9. 內容生產流水線（最大風險）

227 節點 × 500 練習，純手工不現實。流水線：

```
① 規格草稿（我：從 learncpp/core guidelines 取知識點排序）
      ↓
② LLM 生成（題幹 + starter + solution + tests + rubric）
      ↓
③ 自動驗證（§8.4 的 CI，機器把關）
      ↓
④ 難度校準（用「LLM 模擬學員」跑一次，看錯誤率是否落在 30–60%）
      ↓
⑤ 人工抽審（你：每 10 題抽 1 題，確認教學語氣與正確性）
      ↓
⑥ 上線 + 收集真實錯誤率 → 自動調整難度與提示
```

**版權策略**（重要）：
- **自寫**：題幹、starter、solution、測試（本專案主體）。
- **引用連結**：learncpp、cppreference、CppCon 影片 → 只放連結與摘要，**不搬運內容**。
- **可安全重用**：Exercism 的 `problem-specifications`（MIT）、C++ Core Guidelines（MIT-style）、The Algorithms（MIT）→ 需保留授權聲明。
- 要避免：直接抄《C++ Primer》《Effective C++》的練習與文字。

---

## 10. 里程碑（每階段都要「能跑」）

| 階段 | 交付 | 驗收標準 |
|---|---|---|
| **POC ✅ 已完成** | 工具鏈取得、能力探測、沙箱、5 個 grader、內容 CI、1 個示範題 | 見 `docs/01-poc-report.md`：沙箱 6/6、內容 CI 4/4 |
| **M0 垂直切片** | 把 POC 包成 HTTP 服務 + Monaco UI + SQLite 進度 + `doctor` + **5 個節點** | 從空白機器 → 5 個節點全通過，全程不開終端 |
| **M1 入門閉環** | L0 + L1（48 節點）、`io_match` grader、錯誤圖鑑前 30 條、FSRS 複習 | 有別語言經驗者 4 週內寫出可編譯的 CLI 小工具 |
| **M2 物件與泛型** | L2 + L3（85 節點）、code review 模組、2 個專案 | 學員獨立完成「RAII 檔案庫 + 泛型容器」 |
| **M3 工程與效能** | L4 + L5（72 節點）、CMake/CTest/ninja 教學鏈、benchmark grader、可選 WSL「無菌模式」 | 學員交付有測試 + CI 的函式庫 |
| **M4 職場整合** | L6（22 節點）、capstone、模擬面試、分支（後端） | 學員通過 12 項能力矩陣的 80% |

> 不給日曆承諾；POC 已跑通，M0 可以直接開工。

---

## 11. 風險登記表

| 風險 | 影響 | 對策 | 狀態 |
|---|---|---|---|
| 內容量爆炸（227 節點） | 專案永遠做不完 | 生成 + CI 把關；節點可「薄」但不可「假」 | 管線已驗證，仍為**最大風險** |
| Windows 工具鏈地獄 | 90% 新手放棄 | `doctor` 一鍵裝 w64devkit + 環境自檢 | 已緩解（65MB/29s） |
| **非 ASCII 路徑導致連結失敗** | 使用者以為程式壞了 | 工具鏈/建置目錄強制 ASCII，`doctor` 先檢查 | 已定位並規避 |
| **Windows 無 sanitizer** | L4/L5 教學失效 | 改用 5 種可行手段 + 可選 WSL 無菌模式 | 已改設計 |
| 自動批改太淺（只比對輸出） | 學員用硬編碼通過 | hidden tests + 靜態規則 + 隨機測資 + review 題 | 已驗證 |
| LLM 評分不穩 | 誤判、失去信任 | 只用於加分項；rubric + 溫度 0 + 校準集 | 待做 |
| 效能測試噪音 | 誤判失敗 | 中位數 + 寬容門檻 + 標記「環境相關」 | 待校準 |
| 學員依賴 AI 抄答案 | 產品失效 | 三段流程 + 獨立完成率 + 「AI 已關閉」模式 | 待做 |
| 範圍蔓延（4 個專項分支） | 全都做不深 | 只做通用後端分支，其餘留介面 | 已決策 |

---

## 12. 已決策的問題（2026-11-05）

| # | 問題 | 你的選擇 | 對設計的影響 |
|---|---|---|---|
| Q1 | 形態 | **本地 Web 應用**（瀏覽器 UI + 本機服務編譯） | 架構定為 `app/` + `server/` + `content/` + `store/`；Tauri 封裝延後 |
| Q2 | 編譯器 | **自動下載 w64devkit（可攜、離線、真 g++）** | 已實作；並發現必須置於 ASCII 路徑 |
| Q3 | 起點 | **會其他語言、第一次學 C++** | L1 可壓縮約 30%，重點放「指標/記憶體/型別系統」；仍需入門測驗定位 |
| Q4 | 出口 | **四條都想要 → 分期，先通用後端** | L5 之後先做「後端/系統」分支，其餘留接口 |
| Q5 | 推進 | **先做技術 POC** | ✅ 已完成（本文件 + `01-poc-report.md`） |

---

## 13. 參考資料

- Exercism track 規格（concept / prerequisites / test runner）：https://exercism.org/docs/building/tracks/config-json
- Exercism C++ track：https://github.com/exercism/cpp
- Learn C++（章節順序參考）：https://www.learncpp.com
- C++ Core Guidelines：https://isocpp.github.io/CppCoreGuidelines/
- cppreference：https://en.cppreference.com
- Compiler Explorer：https://godbolt.org ｜ C++ Insights：https://cppinsights.io
- w64devkit（可攜 MinGW-w64）：https://github.com/skeeto/w64devkit
- Judge0：https://github.com/judge0/judge0 ｜ DOMjudge：https://www.domjudge.org
- codegrinder：https://pkg.go.dev/github.com/russross/codegrinder
- Ursinus WebIDE（瀏覽器端批改）：https://github.com/BillJr99/Ursinus-WebIDE
- modern-cpp-tutorial：https://github.com/changkun/modern-cpp-tutorial
- CPlusPlusThings：https://github.com/Light-City/CPlusPlusThings
- project-based-learning：https://github.com/practical-tutorials/project-based-learning
- build-your-own-x：https://github.com/codecrafters-io/build-your-own-x
- FSRS 排程器：https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler
- Catch2：https://github.com/catchorg/Catch2 ｜ doctest：https://github.com/doctest/doctest
