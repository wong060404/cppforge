# 迭代器與演算法

C++ 的標準演算法有 100+ 個，但它們的介面只有一個形狀：

```cpp
std::something(first, last, ...);   // first / last 是迭代器
```

學會這個形狀，你就不必再手寫 90% 的迴圈。

## 範圍是半開區間 `[first, last)`

```cpp
std::vector<int> v{3, 1, 4};
std::sort(v.begin(), v.end());    // 排序後 {1, 3, 4}
```

- `begin()` 指向第一個元素
- `end()` 指向「最後一個元素的**後一格**」，不能解參考
- `end() - begin() == size()`

好處：空容器就是 `begin() == end()`，所有演算法在空範圍上都會自然回傳「什麼都沒做」。

## 三個你會天天用的演算法

```cpp
// 計數
auto evens = std::count_if(v.begin(), v.end(), [](int x) { return x % 2 == 0; });

// 找最大值（回傳迭代器，不是值！）
auto it = std::max_element(v.begin(), v.end());
if (it != v.end()) { int m = *it; }

// 排序（就地）
std::sort(v.begin(), v.end());
```

`std::count_if` 回傳 `ptrdiff_t`（有號），要放進 `std::size_t` 得自己轉 —— 這是刻意的，因為「差值」可能為負。

## 演算法不知道容器的存在

這是初學者最容易誤解的一點：

```cpp
std::remove_if(v.begin(), v.end(), pred);   // ❌ 沒有刪掉任何東西
v.size();                                    // 大小不變！
```

`std::remove_if` 做的是「把要保留的元素往前搬」，回傳**新的邏輯結尾**。真正的刪除要呼叫容器的成員函式：

```cpp
v.erase(std::remove_if(v.begin(), v.end(), pred), v.end());   // erase-remove idiom
```

C++20 之後有更短的寫法：`std::erase_if(v, pred);`。

> 為什麼會這樣設計？因為演算法只拿到兩個迭代器，**它根本不知道有沒有一個 vector**。
> 這個限制換來的是：同一份演算法可以套在 array、vector、list、deque、甚至 C 陣列上。

## lambda：演算法的參數

```cpp
std::count_if(v.begin(), v.end(), [](int x) { return x > 10; });
std::count_if(v.begin(), v.end(), [threshold](int x) { return x > threshold; });  // 捕獲
```

`[]` 裡寫要從外部帶進來的變數。捕獲是「複製」還是「參考」由你決定（`[=]` / `[&]`），
本節只需要最簡單的值捕獲。

## 你要實作的部分

```cpp
std::size_t count_even(const std::vector<int>& v);                  // 偶數個數
std::vector<int> sorted_copy(const std::vector<int>& v);            // 排序後的副本，不改動原 vector
bool any_negative(const std::vector<int>& v);                       // 是否有負數
int max_or_zero(const std::vector<int>& v);                         // 最大值；空容器回 0
```

起始碼三個地方漏了：`count_even` 的謂詞寫反、`sorted_copy` 忘了排序、`any_negative` 用了 `all_of`。

> `max_or_zero()` 在起始碼裡是**對的** —— 它示範了「回傳迭代器的演算法要檢查 `end()`」這個模式。
