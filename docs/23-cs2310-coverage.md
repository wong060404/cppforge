# CS2310 概念涵蓋對照表

> 對照基準：**CS2310 25/26 Sem A** 課程教材（8 個 Lecture 目錄、47 個檔案，主要是
> Jupyter notebooks，用 xeus-cpp kernel 執行 C++）
> 要求：涵蓋該教材裡的所有 concept（分佈與順序由本課程調整）
>
> 目前狀態：**40 節**（本輪從 37 → 40，新增 3 節：字面值/sizeof、浮點精度、指標與 C 陣列）

---

## 0. 教材裡有什麼

8 個 Lecture 目錄、47 個檔案，主要是 **Jupyter notebooks**（xeus-cpp kernel）：

| 目錄 | notebooks | 主題 |
|---|---|---|
| Lecture1 | Toolchain, ROOT_kernel, xeus-cpp_kernel | 編譯四階段、CMake、除錯、編譯器、標頭檔、靜態/動態庫 |
| Lecture2 | Elements_of_Computations（358 cells） | 整數字面值、變數、運算子、char、浮點、作用域、字串 |
| Lecture3 | Imperative_Programming（201 cells） | bool、條件、if/switch、while/for |
| Lecture4-5 | Procedural_Abstraction（280 cells） | 函式、lambda、重載、傳參考、static、閉包、遞迴、decorator、多檔案 |
| Lecture6 | Composite_Data（233 cells） | C 陣列、陣列 decay、指標算術、多維、`std::array`、`std::vector` |
| Lecture7 | Sequence_Containers（只有 code cells） | 序列容器 |
| Lecture8 | Encapsulation（108 cells） | class、ctor、member init list、access specifier、`operator++`、`operator<<` |
| Appendices | Agentic_Coding, DeepSeek_Harness, Hermes, Model_Providers | AI 工具鏈（非 C++ 概念） |

---

## 1. 已涵蓋（逐 concept 對照）

### Lecture 1：工具鏈

| CS2310 概念 | 我的節點 | 狀態 |
|---|---|---|
| 預處理 / 編譯 / 組譯 / 連結四階段 | **L0.01** | ✅ 完整（含 `g++ -E/-S/-c` 實作） |
| 三種錯誤的長相（前置/編譯/連結） | **L0.01**、**L0.02** | ✅ |
| 讀懂編譯器訊息 | **L0.02** | ✅ 專節 |
| 標頭檔、`#pragma once`、多檔案 | **L0.03** | ✅ 含支援檔案 |
| `undefined reference` / 重複定義 | **L0.03** | ✅ 加上錯誤圖鑑 |
| CMake、靜態庫 / 動態庫、`inline` | ❌ 未涵蓋 | ⚠️ 見 §3 |
| shell / exit code / 權限 | 部分（`doctor` 檢查環境） | 部分 |

### Lecture 2：計算的元素

| CS2310 概念 | 我的節點 | 狀態 |
|---|---|---|
| 整數字面值（十/十六/八/二進位）、後綴 | **L1.02** | ✅ 本輪新增 |
| `sizeof`、`numeric_limits`、固定寬度 `int32_t` | **L1.02** | ✅ 本輪新增 |
| 變數宣告、初始化方式（default/copy/direct/list）、`auto`、`const`/`constexpr` | **L1.01** | ✅ |
| 窄化（narrowing）與 list-init | **L1.01**、**L1.02**（drill） | ✅ |
| 運算子、賦值鏈、複合賦值、優先序、結合性 | **L1.04** | ✅ |
| `%` 與 `/` 的語意（含負數） | **L1.08** | ✅ 專節 |
| **指標：`&`、`*`、位址、指標算術** | **L1.12** | ✅ 本輪新增 |
| **參考（lvalue reference）、aliasing** | **L1.11** | ✅ |
| 作用域、遮蔽（shadowing）、生命週期 | **L1.10**（控制流）＋各節區域變數 | 部分（無專節，見 §3） |
| `char`、ASCII、signed/unsigned char | **L1.02**（lesson）、**L1.13**（位元組 vs 字元） | 部分（無專節） |
| **浮點：`float`/`double`、精度、IEEE 754、inf/nan** | **L1.03** | ✅ 本輪新增 |
| 字串常值、null 結尾、`strlen`、UTF-8 位元組 | **L1.13**（`std::string`） | 部分（C 字串只在 lesson 提到） |

### Lecture 3：命令式程式設計

| CS2310 概念 | 我的節點 | 狀態 |
|---|---|---|
| `bool`、真值轉換（非 0 為真） | **L1.05**、**L1.01** | ✅ |
| 比較與邏輯運算子、short-circuit | **L1.04** | ✅ 含短路安全順序 |
| **C++ 沒有連鎖比較**（`0 < x < 10`） | **L1.04** | ✅ 專節＋drill |
| `if / else if / else`、邊界、guard clause | **L1.05** | ✅ 專節 |
| `switch`、`case`、fallthrough、對 enum 使用 | **L1.18** | ✅ |
| `enum` / `enum class`、scoped vs unscoped | **L1.18** | ✅ |
| `std::strong_ordering` / `<=>` | ❌ 未涵蓋 | ⚠️ 見 §3 |
| `while` / `for` / range-for / `continue` / `break` | **L1.15**、**L1.10** | ✅ |
| 三元運算子 `?:` | 只在 L1.04 範例出現 | 部分 |

### Lecture 4-5：程序抽象

| CS2310 概念 | 我的節點 | 狀態 |
|---|---|---|
| 函式定義 / 呼叫 / 參數 / 回傳 | **L1.06** | ✅ 專節 |
| 傳值 vs 傳參考、`std::swap` 的實作 | **L1.06**、**L1.11** | ✅ |
| **函式重載**（依參數型別） | ❌ 未涵蓋 | ⚠️ 見 §3 |
| **lambda 運算式、捕獲（`[=]`/`[&]`/`[x]`）、`std::function`、閉包** | ❌ 未涵蓋（`std::count_if` 用過 lambda） | ⚠️ 見 §3 |
| 靜態區域變數（`static`，只初始化一次） | ❌ 未涵蓋 | ⚠️ 見 §3 |
| **遞迴**（Fibonacci、遞迴 vs 迭代、指數複雜度） | ❌ 未涵蓋 | ⚠️ 見 §3 |
| decorator（函式吃函式、回傳函式） | ❌ 未涵蓋 | ⚠️ 依賴 lambda |
| 多檔案：`inline`、header-only、動態庫 | **L0.03**（部分） | 部分 |
| `<cmath>`、`<numbers>`、`std::fabs`/`sqrt` | **L1.03**（`std::fabs`）、**L2.06**（`std::numbers::pi`） | ✅ |

### Lecture 6：複合資料

| CS2310 概念 | 我的節點 | 狀態 |
|---|---|---|
| C 陣列宣告、複合字面值初始化 | **L1.12**、**L1.16**（`std::array`） | ✅ |
| **陣列 decay 成指標、`v[i] == *(v+i)`** | **L1.12** | ✅ 本輪新增 |
| 陣列參考參數 `int (&v)[N]` 保留長度 | **L1.12**（lesson＋drill） | ✅ |
| **多維陣列、row-major、扁平索引** | **L1.12** | ✅ 本輪新增 |
| 回傳陣列的三種方式（static/heap/容器） | **L1.12**（lesson）、**L2.02/L2.03**（RAII） | 部分 |
| `std::array` 容器、型別別名 `using` | **L1.16** | ✅ |
| `std::vector`：`push_back`/`insert`/`size`/`empty` | **L1.09**、**L3.01** | ✅ |

### Lecture 7：序列容器

| CS2310 概念 | 我的節點 | 狀態 |
|---|---|---|
| 序列容器比較（vector / list / deque） | **L5.03**（只講「不要用 list」） | 部分（見 §3） |
| C++20 ranges / `views::iota` | ❌ 未涵蓋 | ⚠️ 見 §3 |

### Lecture 8：封裝

| CS2310 概念 | 我的節點 | 狀態 |
|---|---|---|
| class 定義、成員函式、public/private | **L2.01** | ✅ |
| 建構子、member initializer list、`explicit`、預設參數 | **L2.02** | ✅（`explicit` 在 lesson） |
| 隱式宣告的特殊成員函式 | **L2.02**、**L2.04** | ✅ |
| 靜態成員（所有物件共用） | ❌ 未涵蓋 | ⚠️ 見 §3 |
| **`operator++` 前置/後置（dummy `int`）** | **L2.05**（只做 `+=`/`==`/`<<`） | 部分 |
| `operator<<` 作為非成員函式 + `friend` | **L2.05** | ✅（`friend` 未提） |
| 轉型運算子（conversion operator） | ❌ 未涵蓋 | ⚠️ 見 §3 |

---

## 2. 本輪新增的三節

| 節點 | 主題 | 三個要修的錯 |
|---|---|---|
| **L1.02** 字面值、sizeof 與型別大小 | 四種進位、後綴、`sizeof` 位元組 vs 位元、`numeric_limits`、`int32_t` | 位元組當位元、手寫 `-32767`（應為 -32768）、用位移取低位 |
| **L1.03** 浮點數與精度 | `float`/`double`、`0.1+0.2 != 0.3`、相對誤差、`inf`/`nan` | 用 `==` 比較、中途用 `int` 累加、用 `>1e300` 判無限大 |
| **L1.12** 指標與 C 陣列 | `&`/`*`、指標算術單位、array decay、row-major 扁平索引 | `p + sizeof(int)`、找不到回 `begin`、`col*cols+row` 寫反 |

L1 從 15 節長到 **18 節**，順序重排為：

```
型別 → 字面值/sizeof → 浮點 → 運算子 → 分支 → 函式 → I/O → 整數除法
→ vector → 控制流 → const/參考 → 指標/C陣列 → string → optional
→ 迴圈 → std::array → struct → enum/switch
```

（指標放在「const 與參考」之後：先懂 `&` 是參考，再學 `&` 取位址，語意才不會混。）

---

## 3. 尚未涵蓋的 concept（誠實清單）

依 CS2310 的重要性排序，這些是**已知缺口**：

| # | 缺口 | 出處 | 影響 |
|---|---|---|---|
| 1 | **lambda、捕獲、閉包、`std::function`** | L4-5 | 高（現代 C++ 每天都在用） |
| 2 | **函式重載** | L4-5 | 高（與運算子重載相關） |
| 3 | **遞迴**（含遞迴 vs 迭代、指數複雜度） | L4-5 | 高（框架本來也列為缺口） |
| 4 | **static 區域變數 / static 成員** | L4-5、L8 | 中 |
| 5 | **`operator++` 前置/後置、`friend`、轉型運算子** | L8 | 中 |
| 6 | **序列容器（list / deque）與 C++20 ranges** | L7 | 中 |
| 7 | **CMake、靜態/動態程式庫** | L1 | 中（框架本來規劃在 L4.03） |
| 8 | `<=>` / `std::strong_ordering`、三元運算子、`switch` fallthrough 細節 | L3 | 低 |
| 9 | C 字串（null 結尾、`strlen`）專節 | L2 | 低（已散在 L1.13 課文） |
| 10 | decorator pattern、作用域/生命週期專節 | L4-5、L2 | 低 |

**Appendices 的 4 份 notebook**（Agentic Coding、DeepSeek Harness、Hermes、Model Providers）
是 AI 工具鏈教學，不是 C++ 概念 —— 不在課程範圍。若要納入，應該是一份
「用 AI 助手寫 C++ 的工作流程」附錄，而不是語法節點。

---

## 4. 驗證（本輪）

| 驗證 | 結果 |
|---|---|
| 內容 lint（40 節 + 22 圖鑑 + 提示/步驟/選擇題規則） | **0 問題** |
| 內容 CI（40 節 × 2 變體） | **40/40 全過** |
| 整條解鎖鏈 | **40/40 通過**（L1 有 18 節） |
| UI 冒煙（`--run`） | **55/55** |
| 複習卡 | **93 張** |

新節點的錯誤訊號：L1.02 = 5、L1.03 = 6、L1.12 = 7（宣稱都是 3）。

---

## 5. 建議的下一步

若要把 §3 清單補完，下一輪建議一次做 3 節（維持一輪 3 節的節奏）：

1. **L1.19 Lambda 與閉包**（含 `std::function`、按值/按參考捕獲）
2. **L1.20 函式重載與 `auto` 回傳**
3. **L1.21 遞迴**（Fibonacci、遞迴 vs 迭代、用操作次數量複雜度）

再下一輪：

4. **L2.07 static 成員與類別狀態**（含 `static` 區域變數）
5. **L2.08 運算子進階**（`++` 前置/後置、`friend`、轉型運算子）
6. **L3.05 序列容器**（list/deque 比較、ranges 簡介）
7. **L4.04 建置系統**（CMake、靜態/動態庫、`inline`）
