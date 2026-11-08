# 指標與 C 陣列：位址、decay 與 `*(p+i)`

前面用 `vector` / `std::array` / `std::string` 都很安全。但要讀懂別人的 C++（尤其 C 風格
或系統程式碼），你必須看得懂**指標**。這一節只講三件事：位址、指標算術、陣列 decay。

## 位址與解參考

```cpp
int x = 42;
int* p = &x;    // & 取位址：p 指向 x
*p = 7;         // * 解參考：改到 x 本身
int y = *p;     // y == 7
```

- `&x` 的型別是 `int*`（「指向 int 的指標」）
- `*p` 取得的型別是 `int`
- 兩個恆等式：`*(&x) == x`、`&*p == p`

指標本身也是一個變數（存著一個位址），所以 `sizeof(p)` 是指標大小（64 位元平台是 8）。

## 指標算術：單位是元素

```cpp
int a[5] = {10, 20, 30, 40, 50};
int* p = a;        // 陣列名稱 decay 成 &a[0]

p + 1              // 指向 a[1]（不是「下一個位元組」！）
*(p + 2)           // 30
```

**`p + 1` 會前進 `sizeof(int)` 個位元組**，因為這樣才是「下一個 int」。
常見錯誤是 `p + sizeof(int)` —— 那會前進 4 個元素。

而 `a[i]` 在語言層面就是 `*(a + i)` 的語法糖。

## 陣列 decay：長度會消失

```cpp
void f(int v[5]);     // ⚠ 實際上是 int*（長度 5 只是給人看的）
void g(int (&v)[5]);  // ✅ 陣列參考：長度是型別的一部分
```

```cpp
void f(int v[5]) {
  sizeof(v);          // 8（指標大小），不是 20（5 × int）
}
```

陣列不能按值傳遞，所以函式內**拿不到長度**。這就是為什麼 C 風格 API 總是要
多傳一個 `n`：`void f(const int* data, std::size_t n)`。

## 多維陣列是連續的

```cpp
int m[2][3] = {{1,2,3}, {4,5,6}};
```

記憶體中是 `1 2 3 4 5 6` 連續排列（**row-major**），所以：

```
m[i][j]  等價於  *(m_flat + i * 3 + j)
```

這個公式在處理影像、矩陣、扁平緩衝區時每天都會用到。
注意：方陣會讓「寫反」的 bug 隱形（`i*3+j` 與 `j*3+i` 在 3×3 上一樣），
所以測試要用**非方陣**（例如 2×3）。

## 你要實作的部分

```cpp
const int* next(const int* p);                                   // p 的下一個元素
const int* find_value(const int* begin, const int* end, int target);  // 找不到回 nullptr
std::size_t flat_index(std::size_t row, std::size_t col, std::size_t cols);
```

起始碼三個地方漏了：`next` 用了 `p + sizeof(int)`、`find_value` 找不到時回 `begin`、
`flat_index` 把 row 與 col 寫反。
