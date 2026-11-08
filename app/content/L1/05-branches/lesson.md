# 條件分支：if / else if / else 與邊界

程式的「智慧」幾乎都長在 `if` 裡。這一節講三件事：
**分支要互斥且完整**、**邊界要選對**、**條件順序要合理**。

## 三種基本形狀

```cpp
if (cond) { ... }                       // 只有一種情況

if (cond) { ... } else { ... }          // 二選一

if (c1) { ... } else if (c2) { ... } else { ... }   // 多選一
```

`else` 分支不是「以防萬一」，而是**規格的一部分**：如果所有 `if` 都不成立會怎樣？
那也是一種要定義的行為。

## 邊界：`<` 還是 `<=`

這是 C++ 裡最常見的 off-by-one 來源。判斷方法只有一個：
**把邊界值代進去，用中文念一次。**

| 規格 | 寫法 | 90 分時 |
|---|---|---|
| 「90 分以上是 A」 | `score >= 90` | A ✓ |
| 「高於 90 分才是 A」 | `score > 90` | 不是 A |

兩個都「看起來合理」，差別只在 90 那一點 —— 而測試**一定會測那一點**。

## 順序：從嚴格到寬鬆

```cpp
if (score >= 60) return "D";
else if (score >= 90) return "A";    // ❌ 永遠到不了：>=90 也 >=60
```

`else if` 只在前面全部不成立時才檢查。所以條件必須**由嚴到寬**，
否則後面的分支是死碼 —— 編譯器不會警告，測試會。

## Guard clause：早退比巢狀好讀

```cpp
// ❌ 巢狀
int f(int x) {
  if (x > 0) {
    if (x < 100) {
      return x * 2;
    } else { return -1; }
  } else { return -1; }
}

// ✅ 早退
int f(int x) {
  if (x <= 0) return -1;
  if (x >= 100) return -1;
  return x * 2;
}
```

主邏輯留在最外層、錯誤條件各自一行。巢狀超過兩層通常就是該改寫的訊號。

## 布林運算的順序（搭配 L1.02）

```cpp
if (lo > hi) { std::swap(lo, hi); }   // 先修正前提
if (x < lo) return lo;
if (x > hi) return hi;
return x;
```

「先處理特殊情況，再處理主流程」是同一種思路的另一個樣子。

## 你要實作的部分

```cpp
std::string grade(int score);            // >=90 A、>=80 B、>=70 C、>=60 D、其餘 F
int clamp(int x, int lo, int hi);        // 夾到 [lo, hi]；若 lo > hi 先交換
bool is_leap(int year);                  // 閏年判斷（含世紀規則）
```

起始碼三個地方漏了：`grade` 的 boundary 用 `>`（90 會掉到 B）、`clamp` 沒處理 `lo > hi`、
`is_leap` 只檢查了「4 的倍數」。
