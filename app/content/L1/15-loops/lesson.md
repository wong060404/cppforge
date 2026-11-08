# 迴圈：for、while、do-while 各管什麼

三種迴圈不是「都可以」，而是各有一句話能說清楚的適用場景。

## 選哪一種

| 形式 | 一句話 | 典型用途 |
|---|---|---|
| `for (init; cond; step)` | **次數已知** | 走訪 0..n-1、走訪容器 |
| `while (cond)` | **條件成立就繼續** | 讀到 EOF、找東西、狀態機 |
| `do { } while (cond)` | **至少做一次** | 輸入驗證、重試 |

```cpp
for (std::size_t i = 0; i < v.size(); ++i) { }   // 次數由容器決定
while (std::cin >> x) { sum += x; }              // 讀到沒有資料為止
do { std::cin >> n; } while (n <= 0);            // 一定要先問一次
```

`while (std::cin >> x)` 這一行值得記住：`>>` 在讀不到東西時會回傳失敗狀態，轉成 `bool` 就是 `false`，所以迴圈自然結束。這是 C++ 最道地的「讀到 EOF」寫法。

## 累加與累乘的起始值：單位元素

```cpp
int sum = 0;              // 0 是加法的單位元素：x + 0 = x
long long product = 1;    // 1 是乘法的單位元素：x * 1 = x
```

用 `product = 0` 啟動，**不管迴圈跑幾次結果都是 0** —— 因為乘第一次就歸零了。這不是邊界問題，是整個答案錯，而且編譯器完全不會提醒。

## 迴圈不變式（invariant）：自己檢查邊界的方法

寫完迴圈後，用一句話描述「每一輪開始時什麼一定成立」，這句話就是 invariant：

```
factorial(n):  進入第 i 輪時，result == (i-1)!，且 i <= n
sum_array(a):  進入第 i 輪時，total == a[0] + ... + a[i-1]
```

invariant 讓你不用跑程式也能看出邊界：如果第 `i` 輪開始時 `result == (i-1)!`，那迴圈結束（`i == n+1`）時就是 `n!` —— 所以條件該寫 `i <= n` 還是 `i < n` 就一目了然。

## 何時提早結束

```cpp
for (int d = 2; d * d <= n; ++d) {
  if (n % d == 0) return false;   // 一找到因數就可以斷定不是質數
}
```

`return` 比 `break` 更乾淨（`break` 只是跳出迴圈，之後還要處理「是不是因為找到才跳出」）。多層迴圈才需要 `break` 或 `goto`，而多層迴圈通常該抽成函式。

## 你要實作的三個函式

```cpp
long long factorial(int n);                 // n <= 0 回傳 1
bool is_prime(int n);                       // n < 2 回傳 false
std::optional<std::size_t> first_non_space(const std::string& s);  // 找不到回傳 nullopt
```

起始碼三個各有問題：一個用錯累乘起始值、一個把「2 是偶數」誤判成非質數、一個找的是「第一個空白」而不是「第一個非空白」。
