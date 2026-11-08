# 複製語意：深拷貝與 rule of three

L2.02 我們把複製 `= delete` 掉了 —— 那是逃避。這一節面對它：**如果真的需要複製，該怎麼寫？**

## 預設的複製是「逐成員複製」

```cpp
struct Holder { int* p; };
Holder a; a.p = new int[10];
Holder b = a;        // b.p == a.p —— 同一個位址！
```

編譯器產生的複製建構子會**逐一複製每個成員**。指標成員就只是把位址抄過去。結果：

```cpp
a.p[0] = 42;  b.p[0];   // 42 —— 改一個，另一個也變
delete[] a.p; delete[] b.p;   // 同一塊被釋放兩次 → double free
```

這叫**淺拷貝**。它本身沒有錯，問題在於「這個類別擁有那塊記憶體」但沒有表達出來。

## 深拷貝：連內容一起複製

```cpp
IntArray::IntArray(const IntArray& other)
    : data_(other.size_ > 0 ? new int[other.size_]() : nullptr),
      size_(other.size_) {
  std::copy(other.data_, other.data_ + size_, data_);   // ← 關鍵這一行
}
```

少了 `std::copy` 會怎樣？物件「有大小、有配置」，但**內容全是 0** —— 看起來完全合法，測試才會發現。這是本節的第一個錯。

## 複製賦值：先放掉舊的

```cpp
IntArray& IntArray::operator=(const IntArray& other) {
  if (this == &other) return *this;   // ① 自我賦值保護

  int* fresh = new int[other.size_]();          // ② 先配置新的（例外安全）
  std::copy(other.data_, other.data_ + size_, fresh);

  delete[] data_;                     // ③ 再放掉舊的
  data_ = fresh;
  size_ = other.size_;
  return *this;
}
```

三個細節都不能省：

| 細節 | 漏掉會怎樣 |
|---|---|
| `if (this == &other)` | `a = a` 時先刪掉自己的資料，再從已釋放的來源複製 → 讀取已釋放記憶體 |
| `delete[] data_` | 舊緩衝區永遠沒人釋放 → 每次賦值洩漏一次 |
| 先 `new` 再 `delete` | 若 `new` 拋 `bad_alloc`，物件已經被破壞（例外安全問題） |

**先配置、後釋放**這個順序（copy-and-swap 的精神）是例外安全的基本功：任何一步失敗，物件都還維持在原本的合法狀態。

## Rule of three

> 需要自訂**解構函式、複製建構子、複製賦值運算子**其中一個，通常三個都要。

因為它們共同管理同一份資源：

- 解構函式：釋放
- 複製建構子：取得新的一份
- 複製賦值：放掉舊的、取得新的一份

漏掉任何一個，資源就會洩漏或被釋放兩次。

## 但最好的寫法是不寫

如果你能用 `std::vector<int>` 或 `std::unique_ptr<int[]>` 當成員，上面這些全都不需要 —— 那就是 L2.03 的 rule of zero。**本節存在的目的是讓你知道手寫版本長什麼樣**，這樣你才有能力判斷「什麼時候可以偷懶、什麼時候不能」。

## 你要實作的部分

```cpp
explicit IntArray(std::size_t n);             // n 個 int，全為 0
IntArray(const IntArray& other);              // 深拷貝
IntArray& operator=(const IntArray& other);   // 深拷貝 + 自我賦值安全 + 不洩漏
~IntArray();
void set(std::size_t i, int v);               // 越界丟 out_of_range
int at(std::size_t i) const;                  // 越界丟 out_of_range
std::size_t size() const;
```

起始碼：複製建構子「配置了但沒複製內容」、複製賦值「覆蓋指標前沒釋放舊資料」。
第二個錯不會讓任何測試失敗 —— 只有洩漏檢查抓得到。
