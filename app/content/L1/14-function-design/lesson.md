# 函式設計：「找不到」怎麼表達

這是本課程第一次談「介面設計」。函式的回傳型別，比它的實作更能決定程式碼品質。

## 哨兵值的問題

```cpp
// 用 -1 表示找不到
int find_first_above(const std::vector<int>& v, int threshold);
```

呼叫端會寫：

```cpp
int i = find_first_above(v, 3);
if (i >= 0) { use(v[i]); }
```

看起來沒問題，但：

1. **忘記檢查**是最常見的 bug，而且編譯器不會提醒你。
2. 索引的天然型別是 `std::size_t`（無號）。硬用 `int` 表示 -1，等於在型別系統裡埋一顆地雷 —— 一旦有人把它轉成 `size_t`，`-1` 就變成 `18446744073709551615`。
3. 這個約定只存在於註解裡。下一個人不知道。

## `std::optional<T>`：把「可能沒有」寫進型別

```cpp
#include <optional>

std::optional<std::size_t> find_first_above(const std::vector<int>& v, int threshold);
```

呼叫端變成：

```cpp
if (auto i = find_first_above(v, 3)) {
  use(v[*i]);          // 只有確定有值才解參考
} else {
  // 沒有值：這是必須處理的分支，不是你「可以忘記」的事
}
```

**關鍵差異**：`int` 版本你可以假裝成功；`optional` 版本你不處理就沒東西可用。

代價是多一層包裝、語法稍囉嗦。在「找不到是常態」的介面上，這個代價很值得。

## `std::pair`：回傳兩個相關結果

```cpp
std::optional<std::pair<int, int>> min_max(const std::vector<int>& v);
```

`std::pair` 沒有名字，`first` / `second` 不表達語意。所以：

- 只有**兩個**短期、相鄰使用的值時才用它。
- 三個以上，或有明確語意時，應該定義 `struct`。

```cpp
struct range { int lo; int hi; };   // 比 pair 好讀，且能放進 std::optional
```

本節先用 `pair`，因為 `min_max` 是最經典的「兩個值」案例。

## 空容器：optional 真正的用途

`min_max({})` 該回傳什麼？

- 回傳 `{0, 0}`？錯的 —— 0 不是最小值也不是最大值，只是「沒有值看起來像 0」。
- 回傳 `{INT_MAX, INT_MIN}`？更糟，呼叫端拿到荒謬的數字卻不知道。
- 回傳 `std::nullopt`？**這才是誠實的答案**。

這正是 `optional` 存在的理由：讓「沒有答案」變成一個必須被處理的狀態。

## 你要實作的兩個函式

```cpp
// 回傳第一個「嚴格大於」threshold 的元素的索引；沒有則回傳 std::nullopt
std::optional<std::size_t> find_first_above(const std::vector<int>& v, int threshold);

// 回傳 {最小值, 最大值}；空 vector 回傳 std::nullopt
std::optional<std::pair<int, int>> min_max(const std::vector<int>& v);
```

起始碼用了哨兵值 `0`（對 `find_first_above` 更是完全錯的：0 是合法的索引！），`min_max` 遇到空 vector 會回傳 `{0, 0}`。測試會把這兩件事抓出來。
