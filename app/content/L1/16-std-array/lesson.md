# 固定大小陣列：std::array

`std::array<T, N>` 是「大小是型別一部分」的陣列。它沒有堆積配置、可以 `constexpr`、能複製，而且**大小不可變**。

```cpp
std::array<int, 5> a{1, 2, 3, 4, 5};
a.size();      // 5（編譯期常數）
a[2];          // 3
```

## 與 std::vector 的差別

| | `std::array<T,N>` | `std::vector<T>` |
|---|---|---|
| 大小 | 編譯期固定 | 執行期可變 |
| 記憶體 | 通常在堆疊（或嵌在物件裡） | 堆積 |
| `push_back` | 沒有 | 有 |
| 複製成本 | 小、可預測 | 會配置記憶體 |
| 適用 | 座標、固定欄位、小型緩衝 | 資料筆數不定的集合 |

選擇原則很簡單：**大小會不會變？** 不會就用 `std::array`，讓編譯器幫你保證「永遠是 N 個」。

## 不要手算長度

```cpp
for (std::size_t i = 0; i < sizeof(a) / sizeof(a[0]); ++i)   // 這是 C 陣列的寫法
for (std::size_t i = 0; i < a.size(); ++i)                    // 這樣就對了
for (int x : a)                                              // 不需要索引時最好
```

`sizeof/sizeof` 對 `std::array` 剛好會算出正確值，但那是巧合 —— 一旦型別換成指標或 `std::vector`，這個式子在 `std::vector` 上**會編譯成功卻算錯**（`sizeof(vector)` 是固定的 24，不是元素數）。用 `size()` 就沒有這個陷阱。

## 越界：這次會被抓住

本節的評測開啟了標準庫除錯模式（`-D_GLIBCXX_DEBUG`），所以 `a[a.size()]` 會立刻 abort，而不是安靜地讀到隔壁記憶體。

這只是**學習環境**的保護。正式編譯不會有這個檢查 —— 所以真正的保護來自「迴圈條件寫對」。

## 就地反轉的經典錯誤

```cpp
// 錯：走訪全部索引 → 每對交換兩次 → 回到原樣
for (std::size_t i = 0; i < a.size(); ++i) {
  std::swap(a[i], a[a.size() - 1 - i]);
}

// 對：只走前一半
for (std::size_t i = 0; i < a.size() / 2; ++i) {
  std::swap(a[i], a[a.size() - 1 - i]);
}
```

用 invariant 檢查：第 `i` 輪開始時，「前 `i` 個與後 `i` 個已經就位」。迴圈跑到 `i == n/2` 時，全部就位 —— 所以條件是 `i < n/2`，不是 `i < n`。

## 你要實作的三個函式

```cpp
int sum_array(const std::array<int, 5>& a);
void reverse_array(std::array<int, 5>& a);
std::size_t index_of_max(const std::array<int, 5>& a);   // 回傳索引，不是值
```

起始碼：一個 loop 多跑一格（會被 debugging 模式抓到）、一個反轉寫成全走訪、一個把「最大值」和「最大值的 index」搞混了。
