# 控制流與 off-by-one

程式設計史上最貴的 bug，大概就是 `<=` 寫成 `<`（或反過來）。

## 半開區間：C++ 的預設慣例

```cpp
for (int i = 0; i < n; ++i)     // 走訪 0..n-1，共 n 次
for (int i = 0; i <= n; ++i)    // 走訪 0..n，共 n+1 次  ← 大概率是 bug
```

`std::sort(v.begin(), v.end())`、`std::vector` 的建構子、迭代器範圍……整個標準庫都用**半開區間 `[begin, end)`**。原因很簡單：

- 空區間表示成 `begin == end`，不需要特例。
- 長度就是 `end - begin`，不需要 `+1`。
- 相鄰區間 `[a,b)` 與 `[b,c)` 剛好接起來，不會重疊也不會漏。

一旦你的函式也用半開區間，程式碼就自動跟標準庫對齊，少一整類錯誤。

## guard clause：先處理邊界，再寫主邏輯

```cpp
// 不好：邊界判斷混在迴圈裡
int total = 0;
if (from < to) {
  for (int i = from; i < to; ++i) total += i;
}
return total;

// 好：先擋掉特殊情況，主邏輯就不用想邊界
if (from >= to) return 0;
int total = 0;
for (int i = from; i < to; ++i) total += i;
return total;
```

這個寫法叫 guard clause（護衛子句）。它的價值是**降低讀者的心智負擔**：看到 `for` 的時候，你已經知道 `from < to` 成立。

## 條件順序也是邏輯

FizzBuzz 的經典錯誤：

```cpp
if (n % 3 == 0)       return "Fizz";
else if (n % 5 == 0)  return "Buzz";
else if (n % 15 == 0) return "FizzBuzz";   // 永遠到不了
```

15 的倍數同時是 3 的倍數，所以第一個分支就先攔走了。「最特殊的條件要放最前面」——

```cpp
if (n % 15 == 0) return "FizzBuzz";
else if (n % 3 == 0) return "Fizz";
else if (n % 5 == 0) return "Buzz";
```

## 你要實作的兩個函式

```cpp
// 回傳 [from, to) 的整數總和；若 from >= to 回傳 0
long long sum_range(int from, int to);

// FizzBuzz：把 1..n（含 n）的結果用逗號串成一個字串
// 3 的倍數 → "Fizz"，5 的倍數 → "Buzz"，15 的倍數 → "FizzBuzz"，其餘 → 數字本身
// n <= 0 時回傳空字串
std::string fizz_buzz(int n);
```

範例：`fizz_buzz(5)` → `"1,2,Fizz,4,Buzz"`

起始碼兩個都犯了下文提到的典型錯誤：一個用了閉區間，一個把 `Fizz` 放在 `FizzBuzz` 前面。
