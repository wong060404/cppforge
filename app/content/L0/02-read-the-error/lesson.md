# 讀懂編譯器的抱怨

這一節的起始碼**故意編不過**。你的任務不是「重寫」，而是把編譯器給你的訊息讀完，然後改一個字元。

## 一行診斷訊息的四個部分

```
solution.cpp:6:22: error: expected ';' before '}' token
      │        │  │      │         │
      │        │  │      │         └── 說明：到底期待什麼
      │        │  │      └──────────── 嚴重度：error / warning / note
      │        │  └─────────────────── 欄
      │        └────────────────────── 行
      └─────────────────────────────── 檔案
```

注意那個行號往往指向**問題的下一個位置**。當 GCC 說「在 X 之前應該有 Y」，真正的問題在 X 的前面。

## 三條實用規則

### 1. 只看第一個錯誤

```
solution.cpp:6:22: error: expected ';' before '}' token
solution.cpp:7:3:  error: expected primary-expression before 'return'
solution.cpp:9:1:  error: expected '}' at end of input
```

三個錯誤，一個根因：少了分號。修掉它，另外兩個自動消失。**一次修一個，然後重新編譯** —— 不要看著 7 個錯誤同時改 7 個地方。

### 2. `note:` 不是錯誤，是解釋

```
solution.cpp:4:9: note: candidate function not viable: no known conversion from 'std::string' to 'int'
```

`note` 通常是「我幫你找過，這些候選都不行」。真正的資訊常常在 `note` 裡。

### 3. 警告也是錯（在職場上）

本課程所有節點都開 `-Wall -Wextra -Wpedantic -Werror`。意思是：**警告直接當錯誤**。

為什麼這麼嚴格？因為警告告訴你的往往是真問題：

| 警告 | 真正代表的意思 |
|---|---|
| `unused variable` | 你寫了但沒用的東西 —— 通常是邏輯寫錯或忘了刪 |
| `control reaches end of non-void function` | 有條路徑沒有 `return`，這是**未定義行為** |
| `comparison of integer expressions of different signedness` | `int` 與 `size_t` 混用，負數會變成天文數字 |

## 這一節的兩段式任務

1. **先讓它編譯**：讀訊息，補上缺的東西。
2. **再讓測試通過**：編譯過之後你會看到隱藏測試失敗 —— 因為迴圈邊界寫錯，會讀出 `vector` 範圍外。

第二步正是「能編譯 ≠ 正確」的具體示範。記憶體越界在多數情況下**不會**讓程式立刻崩潰，只會安靜地讀到垃圾值；本課程的評測會用標準庫的除錯模式把它抓出來。

## 你要實作的函式

```cpp
// 回傳前 n 個元素的總和。
// 若 n 大於 values.size()，只加總實際存在的元素（不得越界）。
int sum_first_n(const std::vector<int>& values, std::size_t n);
```

關鍵在最後一句：**`n` 可能比 `size()` 大**。直覺寫法 `for (i = 0; i < n; ++i)` 在 `n > size()` 時就爆了。
