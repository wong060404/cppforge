# 標頭檔、多檔案與連結錯誤

真實專案不會只有一個 `.cpp`。一旦拆成多個檔案，你就會遇到 C++ 最令人困惑的一類錯誤：**編譯全部成功，連結卻失敗**。

## 宣告 vs 定義

```cpp
int square(int x);              // 宣告：告訴編譯器「有這個函式，簽章長這樣」
int square(int x) { return x * x; }   // 定義：真的給出實作
```

- **宣告**可以出現很多次（只要完全一樣）。
- **定義**在整個程式裡只能有一次（One Definition Rule）。

編譯器一次只看到一個「翻譯單元」（一個 `.cpp` 加上它 include 的所有標頭）。當它看到呼叫 `square(3)` 時，只要前面有宣告，它就滿意了 —— 它會產生「呼叫某個符號」的指令，然後把配對的工作留給**連結器**。

所以：

```
編譯：語法對、型別對、名字有宣告 → 通過，產出 .o
連結：把每個 .o 的「我需要 X」與「我提供 X」配對 → 找不到就 undefined reference
```

## undefined reference 的三個常見原因

| 原因 | 症狀 | 修法 |
|---|---|---|
| 忘了把檔案加進編譯指令 | `undefined reference to 'rect_area(int, int)'` | 指令補上 `geometry.cpp` |
| 簽章不一致 | 定義寫成 `int area(int w, int h)` | 參數型別、const、順序必須完全相同 |
| 定義寫在 header 卻忘了 `inline` | `multiple definition of '...'` | 移到 `.cpp`，或加 `inline` |

第二個原因最陰險：`int square(int)` 與 `int square(const int)` 是**不同**的函式；`int square(int)` 與 `int square(int) const` 也不同。C++ 靠簽章配對，不是靠名字。

## 你要做的事

- `geometry.cpp`（支援檔案）已經由「隊友」寫好，提供 `rect_area` 與 `rect_perimeter`。
- `tasks.hpp` 宣告了三個函式，其中 `square_area` **沒有任何人實作**。
- 你的起始碼只有一行 `#include "tasks.hpp"`。

按執行之後你會看到：**編譯通過，連結失敗**。這就是本節要你親眼看到的現象。

修法只有一個：在 `submission.cpp` 裡提供 `square_area` 的定義，而且簽章必須與 `tasks.hpp` 一字不差。

> 為什麼不直接給你一個「有 bug 的實作」？
> 因為這個節點要學的不是「怎麼算面積」，而是「連結器到底在等什麼」。先看懂錯誤，再談實作。
