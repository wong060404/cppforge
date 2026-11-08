# CppForge POC 技術驗證報告

> 版本 v1 · 2026-11-05
> 對象：Windows 11 / x64，使用者目錄含中文（`...\OneDrive\文件\...`）
> 範圍：只驗證「本機編譯 + 沙箱 + 批改」三者是否可行，不含 UI。
> 結論先講：**可行**，但設計文件裡有 4 個假設被實測推翻，已修正（見 §6）。

---

## 1. 驗證了什麼

| # | 問題 | 結論 | 證據 |
|---|---|---|---|
| 1 | 免安裝的 C++ 工具鏈能一鍵取得嗎？ | 可以，65.6 MB / 29 秒 | `poc/tools/fetch-toolchain.mjs` |
| 2 | 它能支撐到哪個 C++ 標準？ | 17/20/23/26 全部可用 | `toolchain-probe.json` |
| 3 | Windows 上能抓 UB 與記憶體錯誤嗎？ | **部分可以**，ASan/UBSan/TSan 完全不行 | §3 |
| 4 | 學員的惡意/錯誤程式碼能被安全隔離嗎？ | 可以，6/6 對抗測試通過 | §4 |
| 5 | 能自動判分並給出教學回饋嗎？ | 可以，5 個 grader、7 秒完成 | §5 |
| 6 | 內容的正確性可以自動把關嗎？ | 可以，內容 CI 4 條規則全過 | §5.3 |

> 能力探測共 21 項：**16 通過、5 項不支援（ASan/UBSan/TSan/LTO/modules）**，
> 沒有「靜默失敗」的項目 —— 每個不支援都有明確的 linker 錯誤訊息為證。

---

## 2. 工具鏈實測

### 2.1 取得與佈署

```
w64devkit 2.11.0 (x64)   SHA-256 已釘死   sha256:54c2bb99…7b2b
下載 65.6 MB → 校驗 → 解壓 29.1s → 100% 可攜（不寫 PATH、不寫註冊表）
```

> 教訓：用 `Copy-Item -Recurse` 複製這棵 100 MB / 數千小檔的樹花了 **>156 秒**；
> 直接解壓只要 **29 秒**。產品一律「解壓」而非「複製」。

### 2.2 內含元件（超出預期）

| 元件 | 版本 | 對課程的意義 |
|---|---|---|
| g++ / gcc | **16.2.0** | 主編譯器；`-std=c++26` 已可編譯 |
| gdb / gdbserver | 18.1 | 「除錯」單元的支柱（實測可產出帶參數的 backtrace） |
| cmake / ctest / cpack | **4.4.4** | L4「建置系統」完全離線可教 |
| ninja | 1.13.2 | CMake 的高速產生器 |
| ccache | — | 加速重複編譯（對 227 個節點的體驗很關鍵） |
| make / binutils / pkg-config | 4.4.1 / 2.47 | 傳統工具鏈知識 |
| gcov / gprof | — | 覆蓋率與效能剖析 |

### 2.3 缺少的東西

| 缺少 | 實測錯誤 | 影響 |
|---|---|---|
| **ASan / UBSan / TSan** | `ld.exe: cannot find -lasan / -lubsan / -ltsan` | L5「併發」與 L4「UB 偵測」不能照原計畫教 |
| clang / clang-tidy | 不在套件內 | 「靜態規則」改用自訂規則 + `-fanalyzer`（實測有效） |
| LTO | `LTO support has not been enabled in this configuration` | 不教 LTO 的細節，只提概念 |
| C++20 modules | `import <iostream>` 不可用 | 模組只做概念介紹，不做實作練習 |

---

## 3. 診斷能力實測矩陣

這是本報告最重要的一節：**決定「能教什麼」**。

| 能力 | 手段 | 結果 | 對應課程 |
|---|---|---|---|
| vector 越界 / 迭代器失效 | `-D_GLIBCXX_DEBUG` | ✅ 攔截，`attempt to subscript container with out-of-bounds index 3` | L3 |
| 容器邊界（可配 -O2） | `-D_GLIBCXX_ASSERTIONS` | ✅ 攔截 | L3/L4 |
| 堆疊溢位 | `-fstack-protector-all` | ✅ 攔截（`0xC0000409`） | L4 |
| 記憶體洩漏 | 自製 `operator new/delete` 攔截 | ✅ 抓到，`LEAKCHECK: 6 leaked block(s)`，exit 86 | L2/L3 |
| 資源洩漏（靜態） | `g++ -fanalyzer` | ✅ `leak of 'p' [CWE-401]`，含事件軌跡 | L4 |
| 崩潰定位 | `gdb -batch -ex run -ex bt` | ✅ `#0 … in divide (a=10, b=0)` | L4/L6 |
| use-after-free 內容損毀 | ASan | ❌ 不支援 | 需替代方案 |
| 有號整數溢位 | UBSan | ❌ 不支援 | 用 `-fanalyzer` + 教學推理 |
| data race | TSan | ❌ 不支援 | 需替代方案 |

### 3.1 被推翻的假設：Windows 沒有 sanitizer

設計文件 §7.1 原本寫「用 ASan/UBSan/TSan 抓 UB」。實測：**MinGW 的 GCC 根本不提供這些 runtime**。

**修正方案（三層）**

1. **主線（零安裝）**：改用上面那五種「真的能用」的手段，並把課程重心從
   「靠工具抓 UB」改成 **「靠推理找 UB + 用能用的工具驗證」**。
   這其實更接近職場真相：多數團隊的 Windows 開發機也沒有 sanitizer。
2. **進階（可選）**：`doctor` 偵測到 WSL2 時，解鎖「無菌模式」——
   在 WSL 裡用真正的 clang + ASan/UBSan/TSan + valgrind。這是唯一乾淨的解法。
3. **面試向**：L6 用「找出這段 code 的 UB」題型補足，不依賴工具。

> 這個發現改變了 L4/L5 的教學設計，已回寫設計文件 §7.1。

### 3.2 順帶發現：Windows 是 LLP64，`long` 只有 4 位元組

探測「效能計時是否可信」時，一段 `std::vector<long>` 的加總得到 `sum=-1455759936`
——不是計時問題，是**整數溢位**。Windows 沿用 LLP64（`long` = 32 位元、指標 = 64 位元），
與 Linux/macOS 的 LP64 不同。

這正是「教科書上的程式碼換平台就爛」的經典案例，已列為課程節點
（`llp64-long`，實測輸出 `long=4 ptr=8`）。
教學價值：**跨平台不是抽象概念，是一個 `long` 就能踩到的坑**。

---

## 4. 沙箱對抗測試：6/6 通過

自己寫的 `sandbox.exe`（C++ / Win32 Job Object，569 KB）取代了
「Node 計時 + taskkill」這種不可靠做法。

| 情境 | 限制 | 結果 |
|---|---|---|
| 正常程式 | 256MB / 3s | ✅ exit 0，峰值 5MB |
| 無窮迴圈 | 3s | ✅ 3016ms 終止整個 job 樹 |
| 記憶體炸彈（嘗試 6.4GB） | 256MB | ✅ 峰值 225MB，配置失敗即停 |
| 輸出洪水（40MB） | 1MB | ✅ 產生 40.0MB → 落地 1024KB，標記截斷 |
| 孤兒行程 | job 關閉即殺 | ✅ 父行程死後 sleeper 全清 |
| 行程爆量（10 個） | 上限 4 | ✅ `spawned_ok=3 failed=7`，主行程未被拖垮 |

**實作要點**
- `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`：supervisor 一死，整棵樹跟著死（沒有孤兒）。
- `ActiveProcessLimit`：fork 炸彈無效。
- `ProcessMemoryLimit`：記憶體炸彈變成 `malloc` 回傳 null，而不是拖垮整台機器。
- 輸出上限做在**讀取執行緒**（丟棄超出部分並計數），不是事後檢查檔案大小——
  否則 40MB 的洪水會先寫爆磁碟。
- `CreateProcess` 用 `CREATE_SUSPENDED` → 先加入 job → 再 `ResumeThread`，
  避免「程式在加入 job 前就開跑」的競態。

**尚未涵蓋（誠實記錄）**
- 網路封鎖（需 WFP/防火牆規則）
- 檔案系統寫入範圍（需低完整性權杖 + ACL）
- 記憶體映射的隱藏通道

這三項列入 M0 之後的「沙箱強化」待辦。目前的隔離等級足以擋住「學員手滑」，
但不足以當多租戶雲端 judge。

---

## 5. 評測器實測

### 5.1 Grader 管線

`poc/runner/run.mjs` 實作 5 個 grader，輸出刻意對齊 Exercism 的 test-runner 契約：

| grader | 檢查 | 阻塞 | 實測耗時 |
|---|---|---|---|
| `compile` | `-Wall -Wextra -Wpedantic -Werror` 全綠 | 是 | ~650 ms |
| `unit_test` | 隱藏測資 + 沙箱執行 | 是 | ~2.6 s（執行僅 47 ms） |
| `runtime_safety` | `_GLIBCXX_DEBUG` + 洩漏攔截 | 是 | ~3.2 s |
| `static_rules` | 禁用寫法（regex + 行號） | 是 | ~1 ms |
| `analyzer` | `-fanalyzer`（CWE 標記） | 否 | ~600 ms |

**一次完整評測 ≈ 7 秒**（含兩次編譯）。對 UI 而言這是「需要進度條」的量級，
但完全可接受；`ccache` 可再壓縮重複提交。

### 5.2 教學回饋品質（實際輸出）

```
L2.raii-file-guard  [violation]  ❌ 未通過  (7015ms)
  PASS  compile         無警告、無錯誤
  FAIL  unit_test       3 過 / 4 敗（需 6 個測試全過）
         · 開檔 → 寫入 → 內容可讀回 — tests.cpp:33  期望 slurp(kPath) == "hello raii" 但兩者不相等
  FAIL  runtime_safety  記憶體洩漏 6 塊
  FAIL  static_rules    發現 1 處違規
         · 第 14 行 [no-raw-new] 這個練習禁用裸 new：檔案所有權請用 RAII 表達
  WARN  analyzer        發現 1 類問題：[-Wanalyzer-malloc-leak]

  💡 教學提示：
     - 記憶體洩漏：有 new 沒有對應的 delete。練習目標是讓 RAII 物件替你管理。
  診斷：
     submission.cpp:15:16  warning: leak of 'buf' [CWE-401]
```

兩個 UX 缺陷在實作中被抓到並修掉：
1. **絕對暫存路徑洩漏給學員** → 訊息一律 scrub 成 `tests.cpp:33`。
2. **測試失敗被誤報成「執行期崩潰」** → 區分 NTSTATUS 異常碼與「測試未通過」。

### 5.3 內容 CI：4 條規則全過

這是「227 個節點能被自動化生產」的前提。每個題目都必須滿足：

| 規則 | 用意 | 實測 |
|---|---|---|
| 參考解全數通過 | 題目本身沒壞 | ✅ `compile=pass unit_test=pass runtime_safety=pass static_rules=pass` |
| 起始碼「編譯過但測試失敗」 | 學員不會一開局就卡在編譯錯誤 | ✅ `compile=pass unit_test=fail` |
| 違規碼被靜態規則擋下 | 評測器不是擺設 | ✅ `static_rules=fail` |
| 違規碼的洩漏被抓到 | 記憶體檢查真的有效 | ✅ `runtime_safety=fail`（6 塊洩漏） |

成本：**每個題目約 21 秒**（3 個變體 × 7 秒）。完全可以放進 pre-commit。

---

## 6. 被推翻/修正的設計假設

| # | 原假設 | 實測結果 | 修正 |
|---|---|---|---|
| 1 | Windows 可用 ASan/UBSan/TSan | ❌ MinGW 不提供 | 改用 5 種可行手段 + 可選 WSL「無菌模式」；L4/L5 教學重心轉向「推理 + 可用工具」 |
| 2 | 沙箱可以用 Node 計時 + taskkill | ❌ 擋不住記憶體炸彈/孤兒行程 | 自寫 Win32 Job Object supervisor（已實作、已驗證） |
| 3 | 建置目錄可以放在專案旁 | ❌ **ld.exe 完全無法處理非 ASCII 路徑** | 工具鏈與建置目錄強制 ASCII（`%LOCALAPPDATA%\CppForge`），`doctor` 主動檢查 |
| 4 | 用系統 HTTPS（curl/WinHTTP）下載工具鏈 | ❌ 本機 schannel `SEC_E_NO_CREDENTIALS` | 用 Node 自帶 TLS（OpenSSL），不依賴系統憑證堆疊 |

### 6.1 非 ASCII 路徑：最隱蔽的坑

```
ld.exe: cannot find .../bin/../lib/gcc/x86_64-w64-mingw32/16.2.0/../../../../lib/crt2.o
ld.exe: cannot find -lstdc++   -lmingw32   -lgcc   -lmingwex   -lmsvcrt ...
```

`cc1plus` 讀中文路徑的原始碼**沒問題**，但 `ld` 處理中文路徑**一律失敗**
（連自己的 `crt2.o` 都找不到）。已測出精確邊界：

- ✅ 原始碼路徑含中文（使用者專案可以放任何地方）
- ❌ 工具鏈路徑含中文
- ❌ `-o` 輸出路徑含中文

所以產品只需要一條規則：**建置目錄必須 ASCII，原始碼不用**。這比原本擔心的寬鬆很多。

---

## 7. 對後續開發的具體結論

1. **技術風險已排除**：核心三件事（編譯、沙箱、批改）在真實 Windows 環境全部跑通，
   而且都有可重複執行的腳本與 JSON 報告。
2. **最大風險從「技術」變成「內容」**：管線證明可行，接下來缺的是 227 個節點的內容。
3. **M0 的定義可以更具體**：把 POC 的三個腳本包成服務 + 一個瀏覽器 UI，
   加上 `doctor`、SQLite 進度、Monaco 編輯器，就是 M0。
4. **沙箱要補三件事才敢對外**：網路封鎖、檔案寫入範圍、多租戶隔離。

### 7.1 建議的下一步（M0）

| 項目 | 內容 | 依據 |
|---|---|---|
| 服務化 | 把 `run.mjs` 包成 HTTP 服務（`POST /run`） | 契約已定 |
| UI | Monaco + 題目面板 + 結果面板（三欄） | 7 秒評測需要進度條 |
| 進度 | SQLite：節點狀態、嘗試紀錄、獨立完成率 | 設計文件 §8.3 |
| 內容 | L0 + L1 前 10 個節點（用 §5.3 的 CI 把關） | 先驗證學習曲線 |
| doctor | 一鍵裝工具鏈 + 環境自檢 + 中文路徑偵測 | §6.1 |

---

## 8. 重現方式

```powershell
# 1. 取得工具鏈（65MB，一次性）
$env:CPPFORGE_HOME = "$env:TEMP\cppforge-home"
node cppforge/poc/tools/fetch-toolchain.mjs

# 2. 探測本機能力（產出 matrix）
node cppforge/poc/tools/probe.mjs

# 3. 沙箱對抗測試（6 項）
node cppforge/poc/runner/sandbox-tests.mjs

# 4. 內容 CI（參考解 / 起始碼 / 違規碼）
node cppforge/poc/runner/run.mjs --exercise cppforge/poc/fixtures/L2-raii-file-guard --ci

# 5. 單次評測（學員視角）
node cppforge/poc/runner/run.mjs --exercise cppforge/poc/fixtures/L2-raii-file-guard --variant starter
```

報告輸出於 `cppforge/poc/reports/*.json`。

---

## 9. 產出清單

| 檔案 | 作用 | 行數 |
|---|---|---|
| `poc/tools/paths.mjs` | ASCII 家目錄解析 + 守衛 | ~60 |
| `poc/tools/fetch-toolchain.mjs` | 下載/校驗/解壓（冪等） | ~135 |
| `poc/tools/probe.mjs` | 能力探測（doctor 原型） | ~330 |
| `poc/runner/sandbox.cpp` | Win32 Job Object 沙箱監管程式 | ~330 |
| `poc/runner/sandbox-tests.mjs` | 6 項對抗測試 | ~215 |
| `poc/harness/leak_check.cpp` | operator new 洩漏攔截 | ~150 |
| `poc/runner/cf_test.hpp` | 零依賴測試框架（兼教材） | ~135 |
| `poc/runner/run.mjs` | 評測管線（5 grader + 內容 CI） | ~500 |
| `poc/fixtures/L2-raii-file-guard/` | 示範題（含參考解/起始碼/違規碼/隱藏測試） | ~250 |

全部可用 `node` 直接執行，無 npm 依賴。
