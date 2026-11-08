# 浮點數與精度：為什麼 0.1 + 0.2 不等於 0.3

```cpp
double x = 0.1 + 0.2;
bool same = (x == 0.3);    // false
```

這不是 C++ 的 bug，是二進位的必然。這一節講清楚**為什麼**，以及**該怎麼寫**。

## 為什麼不相等

`0.1` 在十進位是有限小數，在**二進位**卻是無限循環小數（就像 1/3 在十進位是 0.333…）。
`double` 只能存 53 位有效位元，所以 `0.1`、`0.2`、`0.3` 存的都是近似值：

```
0.1  →  0.1000000000000000055511151231257827…
0.2  →  0.2000000000000000111022302462515654…
相加  →  0.3000000000000000444089209850062616…
0.3  →  0.2999999999999999888977697537484346…
```

兩個近似值相加的結果，和 `0.3` 的近似值不一樣。**這不是誤差太大，是誤差必然存在。**

## 正確的比較方式

```cpp
bool nearly_equal(double a, double b, double eps) {
  const double diff = std::fabs(a - b);
  const double scale = std::max({1.0, std::fabs(a), std::fabs(b)});
  return diff <= eps * scale;      // 相對誤差
}
```

`eps` 從 `std::numeric_limits<double>::epsilon()` 出發（約 2.2e-16），
依需求放寬（例如 1e-9）。用「相對」而不是「絕對」誤差，是因為
`1e9` 之間的差 1 和 `1e-9` 之間的差 1 完全不是同一件事。

## float 還是 double

| | 位元 | 有效數字 | 什麼時候用 |
|---|---|---|---|
| `float` | 32 | ~7 位 | 省記憶體（大陣列、GPU、嵌入式） |
| `double` | 64 | ~15 位 | **預設選這個** |

在現代 CPU 上兩者運算速度幾乎一樣，所以預設 `double`。
**金錢不要用浮點** —— 用整數（以「分」為單位），否則 0.1 元的誤差會累積。

## 三個特殊值

```cpp
double inf = 1.0 / 0.0;      // +inf
double ninf = -1.0 / 0.0;    // -inf
double nan = 0.0 / 0.0;      // nan（不是數）
```

- `std::isfinite(x)`：是不是有限的數
- `std::isinf(x)`：是不是無限大（正負再用 `x > 0` 分）
- `std::isnan(x)`：是不是 `nan`

`nan` 的陷阱：**它與任何值比較都是 false**，包括它自己。
所以 `if (x == x)` 不一定是 true，檢查 `nan` 只能用 `std::isnan`。

## 不要用「大於某個很大的數」判斷無限大

```cpp
if (x > 1e300) { /* 以為是 inf */ }   // ❌ 1e301 是有限數
if (std::isinf(x) && x > 0) { }       // ✅
```

## 你要實作的部分

```cpp
bool nearly_equal(double a, double b);   // |a-b| 在相對誤差 1e-9 內
double mean3(double a, double b, double c);   // 三數平均（保留小數）
bool is_positive_inf(double x);          // 是不是 +inf
```

起始碼三個地方漏了：`nearly_equal` 用 `==`、`mean3` 中間用 `int` 累加、
`is_positive_inf` 用「大於 1e300」判斷。
