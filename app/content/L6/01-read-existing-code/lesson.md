# 讀陌生程式碼：介面文件沒寫的事，只有原始碼知道

前 28 節的介面都是「為你設計的」：清楚、一致、有教學意圖。
真實工作相反：**你拿到的是別人的模組**，而它的文件通常沒寫到你要的那一點。

這一節給你兩個「同事寫好的」模組：

```
stats.hpp / stats.cpp     → 算統計摘要
format.hpp / format.cpp   → 格式化輸出
```

**你不能修改它們**，只能讀、然後正確使用。

## 第一個陷阱：`mean` 不是你想的那個平均

```cpp
struct Summary {
  std::size_t n;
  int min;
  int max;
  double mean;
};
std::optional<Summary> compute(const std::vector<int>& samples);
```

名字很中性。但如果你打開 `stats.cpp`：

```cpp
// 「非零」才算進平均：0 代表這個樣本沒有讀到值
for (int v : samples) { if (v != 0) { sum += v; ++counted; } }
```

`compute({0, 10, 20})` 的 mean 是 **15**（`(10+20)/2`），不是 10。
`n`、`min`、`max` 仍然是全部元素的。

這是**合理的設計**（感測器回報 0 代表沒讀到），但如果你按名字猜，後面每個「高於平均」
的計算都會錯。**讀名字是猜測，讀實作才知道。**

## 第二個陷阱：`optional` 就是「可能沒有」

```cpp
const stats::Summary s = stats::compute(samples).value();   // ❌ 空輸入時丟例外
```

回傳 `optional` 就是在說「可能沒有值」。直接 `.value()` 等於斷言「一定有」——
空的時候丟 `bad_optional_access`，用 `*opt` 更是未定義行為。

正確：

```cpp
const auto s = stats::compute(samples);
if (!s.has_value()) return "no data";
```

## 第三個陷阱：格式不在型別裡

```cpp
std::string fixed(double value, int decimals);
std::string percent(double ratio);      // 0.5 → "50.0%"
```

兩個都回傳 `std::string` —— 編譯器**完全無法幫你檢查**「幾位小數」、「有沒有 `%`」、
「空格在哪」。這一類規格只能靠讀 + 測試。

本節的輸出契約：

```
"n=3 min=0 max=20 mean=15.00"     ← mean 兩位小數
"above=33.3%"                     ← 一位小數，附 %
```

## 你要實作的部分

```cpp
std::string summary_line(const std::vector<int>& samples);
//   空輸入 → "no data"
//   否則    → "n=<n> min=<min> max=<max> mean=<兩位小數>"

std::string above_average_line(const std::vector<int>& samples);
//   用模組算出的 mean（不是全體平均）判斷「高於」
//   空輸入或 mean == 0 → "above=0.0%"
//   否則 → "above=<一位小數>%"
```

起始碼三個地方沒讀懂：`summary_line` 直接 `.value()`（空輸入會丟例外）、
`mean` 用一位小數（契約是兩位）、`above_average_line` 自己重算了全體平均。
