# erase-remove idiom：為什麼 remove 沒有刪掉東西

這是 STL 最反直覺的一件事：

```cpp
std::vector<int> v{1, 2, 2, 3};
std::remove(v.begin(), v.end(), 2);
v.size();     // 還是 4！
```

## 為什麼

因為 **演算法不認識容器**。`std::remove` 只拿到兩個迭代器，它不知道有沒有一個 `vector`，
所以不可能改變 `size()`。

它實際做的是：

```
原始：  [1, 2, 2, 3]
搬移：  [1, 3, ?, ?]   ← 把「不等於 2」的元素往前搬，回傳指向第一個 ? 的迭代器
```

那個 `?` 是**不確定值**（通常是原本的殘留）。元素沒有消失，只是被搬到後面去了。

所以要真的縮小，必須再加一步：

```cpp
v.erase(std::remove(v.begin(), v.end(), 2), v.end());   // 這才是完整寫法
// 或 C++20：std::erase(v, 2);
```

這叫 **erase-remove idiom**。記憶方式：`remove` 負責搬、`erase` 負責刪。

## 去重：sort → unique → erase

```cpp
std::sort(v.begin(), v.end());                      // ① unique 只處理相鄰重複，所以必須先排序
v.erase(std::unique(v.begin(), v.end()), v.end());  // ② 搬 + 刪
```

漏掉 ①（不排序）→ 重複的沒被移除。
漏掉 ②（不 erase）→ `size()` 沒變，尾端全是垃圾。

這就是本節的第一個錯。

> **編譯器也想幫你**：`std::unique` 的回傳值標了 `[[nodiscard]]`，直接忽略會編不過。
> 但注意 —— 把回傳值存起來（例如 `const auto new_end = std::unique(...)`）就「通過」了，
> 錯誤於是變成靜默的。**編譯器只能提醒你，不能替你做決定。**

## 刪除「不等於」的陷阱

```cpp
std::remove_if(v.begin(), v.end(), [value](int x) { return x != value; })
```

上面這行會**刪掉所有不等於 value 的元素** —— 也就是只留下 value。謂詞的語意是
「**要移除的條件**」，不是「要保留的條件」。這是本節的第二個錯，而且它不會報錯，
只會讓結果剛好相反。

## `std::set`：自動排序 + 去重

```cpp
std::set<int> s{3, 1, 3, 2};   // {1, 2, 3}
```

`set` 幫你做兩件事：排序與去重。它也支援集合運算：

```cpp
std::set_intersection(a.begin(), a.end(), b.begin(), b.end(), std::back_inserter(out));
```

這要求兩個輸入都已排序 —— `set` 的迭代器天生就有序，所以直接可用。

## 迭代器失效

```cpp
for (auto it = v.begin(); it != v.end(); ) {
  if (should_remove(*it)) {
    it = v.erase(it);    // erase 回傳下一個有效位置
  } else {
    ++it;
  }
}
```

`erase` 會讓「被刪位置到 `end()`」的所有迭代器失效。直接 `++it` 是未定義行為。

## 你要實作的部分

```cpp
std::vector<int> unique_sorted(const std::vector<int>& v);   // 去重且遞增
std::size_t remove_all(std::vector<int>& v, int value);      // 就地移除所有 value，回傳新 size
std::vector<int> intersect_sorted(const std::vector<int>& a, const std::vector<int>& b);
```

起始碼三個地方漏了：`unique_sorted` 忘了 erase、`remove_all` 的謂詞寫反、`intersect_sorted` 只取了 a 的元素而沒有真的取交集。
