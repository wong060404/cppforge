# 泛型入門：template 與 concept

到目前為止，每個函式都綁死一種型別。`sum_all(const std::vector<int>&)` 只能處理 `int`。
想支援 `double` 就得再寫一份 —— 而這是純粹的重複。

## 樣板：讓編譯器幫你寫那些重複的版本

```cpp
template <class T>
T sum_all(const std::vector<T>& v);
```

`T` 不是變數，是**型別的佔位符**。你寫**一份**，編譯器在你使用的地方各生成一份：

```cpp
sum_all<int>(v1);            // 生成 int 版本
sum_all<std::string>(v2);    // 生成 std::string 版本
sum_all(v3);                 // 也可以讓編譯器自己推導 T
```

這叫**隱式具現化**（implicit instantiation）。

## 為什麼定義必須放在標頭檔

這是初學者最常撞的牆。假設你這樣寫：

```cpp
// sum.hpp
template <class T> T sum_all(const std::vector<T>& v);   // 只有宣告

// sum.cpp
template <class T> T sum_all(const std::vector<T>& v) { ... }   // 定義

// main.cpp
#include "sum.hpp"
sum_all<int>(v);   // ⚠ 連結錯誤：undefined reference to `int sum_all<int>(...)`
```

`main.cpp` 編譯時只看得到宣告，編譯器**無法生成 `int` 版本**；
`sum.cpp` 裡有定義，但那個檔案裡沒有任何 `sum_all<int>` 的使用，所以也**沒有生成**。

結果：誰都沒生成 → 連結失敗。

所以規則很簡單：**樣板的定義放標頭檔**。這也是為什麼 STL 全是標頭檔。

> 本節的提交檔案就是 `submission.hpp` —— 你會親眼看到這件事。

## concept：把「這個型別必須支援什麼」寫進介面

```cpp
template <class T>
concept Addable = requires(T a, T b) {
  { a + b } -> std::convertible_to<T>;
};

template <Addable T>
T sum_all(const std::vector<T>& v);
```

`requires` 裡面寫的是**必要條件**：

- `{ a + b }` —— 這個表達式必須能編譯
- `-> std::convertible_to<T>` —— 而且結果要能轉成 `T`

沒有約束的話，`sum_all<std::vector<int>>(v)` 會在樣板內部深處噴出幾十行錯誤，
而且指向 `total = total + v[i];` 那一行 —— 完全看不出是呼叫端傳錯型別。

有了 `concept`，錯誤直接說：**`T` 不滿足 `Addable`**，位置就在呼叫端。

## 三個常見的樣板錯誤

| 錯誤 | 為什麼難發現 |
|---|---|
| 迴圈起始索引寫錯 | 對 `int` 和 `string` 都會錯，但只有測試會發現 |
| 邊界條件用 `>=` 而不是 `>` | 語意差異只在「等於」那一點上 |
| 回傳值順序顛倒（`{max, min}`） | 型別完全正確，編譯器不可能抓到 |

這三個錯的共同點：**它們跟型別無關**。樣板讓你把邏輯寫一次，
所以一個邏輯錯誤會同時影響所有型別 —— 這是樣板的代價，也是測試必須涵蓋多種型別的原因。

## 你要實作的部分

```cpp
template <Addable T>
T sum_all(const std::vector<T>& v);            // 元素和；空 vector 回傳 T{}

template <class T>
std::vector<T> greater_than(const std::vector<T>& v, const T& threshold);
//   回傳嚴格大於 threshold 的元素，保持原順序

template <class T>
std::pair<T, T> min_max(const std::vector<T>& v);
//   回傳 {最小值, 最大值}；空 vector 回傳 {T{}, T{}}
```

起始碼三個地方漏了：`sum_all` 的迴圈從索引 1 開始（漏掉第一個元素）、
`greater_than` 用了 `>=`、`min_max` 把兩個值的位置放反了。
