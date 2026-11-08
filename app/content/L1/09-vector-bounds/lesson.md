# vector 與 size_t

`std::vector` 是 C++ 最常用的容器。它有三件事你必須在今天就記牢。

## 1. `size()` 是無號的

```cpp
std::vector<int> v{1, 2, 3};
int n = v.size();      // 可行，但會有 signed/unsigned 轉換警告
for (int i = 0; i < v.size(); ++i) { ... }   // ⚠ 比較有號與無號
```

`size()` 回傳 `std::size_t`（無號）。跟 `int` 比較時，`int` 會被轉成無號 —— 如果它本來是 `-1`，就變成一個天文數字：

```cpp
std::vector<int> empty;
for (int i = 0; i <= empty.size() - 1; ++i) { ... }
// empty.size() - 1 == 18446744073709551615
// i 被轉成無號後 <= 成立 → 造訪 empty[0] → 未定義行為
```

本課程開了 `-Wall -Wextra`，`-Wsign-compare` 會直接把它變成錯誤。**這就是為什麼警告要當錯看**。

正確寫法：用 `std::size_t` 當索引，或直接用範圍 for。

```cpp
for (std::size_t i = 0; i < v.size(); ++i) { ... }
for (int x : v) { ... }               // 不需要索引時最好用這個
```

## 2. `operator[]` 不檢查邊界

| 寫法 | 邊界檢查 | 越界時 |
|---|---|---|
| `v[i]` | 無 | 未定義行為 |
| `v.at(i)` | 有 | 拋 `std::out_of_range` |

`v[i]` 之所以快，正是因為它什麼都不檢查。**「未定義行為」不代表「一定崩潰」** —— 它可能安靜地讀到隔壁的記憶體，讓你的程式算出一個看起來合理的錯答案，三天後在客戶那裡才爆炸。

本節的評測會用標準庫的除錯模式（`-D_GLIBCXX_DEBUG`）把越界抓出來。你寫的 `v[i]` 在開啟除錯模式後會立刻 abort —— 這是學習用，不是正式執行環境的行為。

## 3. 空容器是合法輸入

`max_of({})` 該回傳什麼？這個問題逼你面對「邊界條件」：

- 回傳 0？但 `0` 可能是合法最大值（例如 `{-5, -3}` 的最大值是 `-3`，不是 0）。
- 拋例外？那就得在介面契約裡寫清楚。
- 回傳 `std::optional<int>`？這是最誠實的表達，但要改介面。

本節採用最簡單的契約：**空 vector 回傳 0**，並在測試裡明確驗證。真實專案裡，這種「函式對空輸入的行為」必須寫在文件或型別裡，不能靠猜。

## 你要實作的三個函式

```cpp
// 回傳第 i 個元素；i 越界時回傳 0
int safe_at(const std::vector<int>& v, std::size_t i);

// 回傳最大值；空 vector 回傳 0
int max_or_zero(const std::vector<int>& v);

// 回傳嚴格大於 threshold 的元素個數
std::size_t count_above(const std::vector<int>& v, int threshold);
```

起始碼三個都有問題：`safe_at` 沒檢查邊界、`max_or_zero` 用 0 當種子、`count_above` 把「嚴格大於」寫成了「大於等於」。
