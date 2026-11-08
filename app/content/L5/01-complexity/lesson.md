# 複雜度與成本模型：量操作次數，不是量秒數

前 26 節的錯誤都有明確的「對／錯」。這一節開始問另一個問題：**它要花多少代價？**

## 為什麼不用秒數

```cpp
auto t0 = std::chrono::steady_clock::now();
run();
auto ms = ...;                      // 這數字不可重現
if (ms > 50) FAIL("太慢");
```

同一份程式碼在共用 CI、你的筆電、鄰居的虛擬機上會差好幾倍。
這種斷言會變成隨機失敗的來源 —— 而 flaky 測試比沒有測試更糟，因為你會開始忽略紅色。

**可重現的做法：量操作次數。**

```cpp
struct Counted {
  int v;
  static long long ops;
  friend bool operator<(const Counted& a, const Counted& b) { ++ops; return a.v < b.v; }
  friend bool operator==(const Counted& a, const Counted& b) { ++ops; return a.v == b.v; }
};
```

把 `Counted` 當元素型別丟進你的函式，跑完看 `Counted::ops`。
這是**演算法的性質**，與機器完全無關。

## n = 1000 的真實差距

| 演算法 | 比較次數 | 感受 |
|---|---|---|
| O(n²) 雙迴圈 | 約 500,000 | 「好像也還好」 |
| O(n log n) 排序 | 約 10,000 | 快 50 倍 |
| O(n) 單次走訪 | 約 1,000 | 快 500 倍 |

在 n = 1000 時差距還是「可以忍」；n = 10⁶ 時就是 **10¹² 對 2×10⁷** —— 幾小時對零點幾秒。
這就是為什麼「先讓它能跑，再讓它快」之後，通常還得再改一次演算法。

## 兩個具體的取捨

### 找重複元素

```cpp
// O(n²)：對每個元素，往後找有沒有一樣的
for (i) for (j > i) if (v[i] == v[j]) { ++dup; break; }
```

```cpp
// O(n log n)：排序 + 相鄰比較
auto copy = v;
std::sort(copy.begin(), copy.end());
for (i = 1; i < n; ++i) if (copy[i] == copy[i-1]) { ++dup; }
```

排序版本多花了記憶體（一份 copy），換到 50 倍的比較次數。**這是典型的空間換時間** ——
而「該不該換」取決於資料量與記憶體預算，不是原則問題。

### 找最大與次大

```cpp
// O(n log n)：排序後取最後兩個 —— 但你只需要兩個！
std::sort(copy.begin(), copy.end());
return {copy[n-1], copy[n-2]};
```

```cpp
// O(n)：一次走訪，帶著兩個變數
for (x : v) {
  if (x > best)        { second = best; best = x; }
  else if (x < best)   { if (!has_second || x > second) { second = x; has_second = true; } }
}
```

直覺上「排序後取最後兩個」很簡潔，但它做了大量與問題無關的工作。
**能用一次走訪解決的，就不要排序。**

## 你要實作的部分

```cpp
template <class T>
std::size_t count_duplicates(const std::vector<T>& v);
//   回傳「重複出現的元素個數」（同一元素重複多次只算一次）
//   必須在 O(n log n) 比較次數內完成

template <class T>
std::optional<std::pair<T, T>> top_two(const std::vector<T>& v);
//   回傳 {最大, 次大}；次大必須嚴格小於最大
//   元素少於 2 個，或所有元素都相同 → nullopt
//   必須在 O(n) 比較次數內完成
```

起始碼兩個地方不合格：`count_duplicates` 是雙 loop（O(n²)），
`top_two` 先 sort 再取最後兩個（O(n log n)，而且遇到重複最大值會 return 兩個一樣的數）。
