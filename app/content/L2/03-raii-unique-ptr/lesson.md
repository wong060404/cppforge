# RAII 與 unique_ptr

上一節的 `Buffer` 能動，但要你記得三件事：解構函式要 `delete[]`、複製要禁用、自我賦值要處理。**只要人還需要記得，就會忘。**

這一節做的是把「記得」變成「不必記得」。

## 換一個成員，少一半程式碼

```cpp
// L2.02：手寫版
int* data_;
std::size_t size_;
// → 需要自己寫 ~Buffer()、禁用複製、處理例外

// L2.03：RAII 版
std::unique_ptr<int[]> data_;
std::size_t size_ = 0;
// → 不需要解構函式，不需要 delete，複製自動被禁止
```

`std::unique_ptr` 的三個保證：

1. **解構時自動 delete**（陣列版用 `delete[]`）→ 不可能忘記。
2. **不可複製**（編譯期就擋住）→ 不可能 double free。
3. **可以移動**（明確表達「所有權轉移」）→ 需要轉手時寫得出來。

這就是 **rule of zero**：成員自己會管理資源，你就不需要寫任何特殊成員函式。

## 移動：所有權的轉手

```cpp
Buffer a(4);
Buffer b = std::move(a);   // b 接手 a 的資料
// a 現在是空的
```

「移動」不是把記憶體搬過去（那很貴），而是**把指標交出去並把來源清空**。所以移動建構子必須做兩件事：

```cpp
Buffer::Buffer(Buffer&& other) noexcept
    : data_(std::move(other.data_)), size_(other.size_) {
  other.size_ = 0;    // ← 少這一行，來源物件會「以為自己還有資料」
}
```

少了那一行，`a.size()` 會回報 4，但 `a.data_` 已經是 `nullptr` —— **狀態不一致**。這種物件解構時沒問題（`unique_ptr` 會處理空指標），但任何讀取都是災難。

> 標準只要求被移動後的物件「有效但未指定」。本節刻意把它規範成「空」，
> 因為**可預測的行為比「最小合法」更有價值**。

## `noexcept` 不是裝飾

```cpp
Buffer(Buffer&& other) noexcept;
```

移動建構子標 `noexcept` 很重要：`std::vector` 重新配置時，只有在移動是 `noexcept` 的情況下才會用移動，否則它會退回**複製**（因為移動途中拋例外會讓容器無法保證一致性）。這直接影響效能。

## 你要實作的部分

```cpp
explicit Buffer(std::size_t n);              // 配置 n 個 int，全為 0
Buffer(Buffer&& other) noexcept;             // 接手資料，並把 other 變成空
Buffer& operator=(Buffer&& other) noexcept;  // 同上（賦值版）
void set(std::size_t i, int v);              // 越界丟 out_of_range
int  at(std::size_t i) const;                // 越界丟 out_of_range
std::size_t size() const;
bool empty() const;                          // 沒有元素（含被移走後）為 true
```

起始碼：`size()` 多算一個、`empty()` 判斷相反、move constructor 忘了把來源歸零。
