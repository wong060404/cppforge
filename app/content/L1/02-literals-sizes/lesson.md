# 字面值、sizeof 與型別大小

寫 `42` 的時候，編譯器要決定三件事：**值**、**進位**、**型別**。
這一節把這三件事講清楚，順便講「一個 int 到底多大」。

## 四種進位，同一個數字

```cpp
int a = 255;            // 十進位
int b = 0xFF;           // 十六進位（0x 開頭）
int c = 0377;           // 八進位（0 開頭）← 最容易看錯
int d = 0b1111'1111;    // 二進位（C++14 起），' 是數字分隔符
```

四個都是 255。**`0377` 不是十進位的 377** —— 開頭的 `0` 就是八進位的記號。
這是 C++ 從 C 繼承下來的陷阱，寫前導零的十進位數字會得到完全不同的值。

## 後綴決定型別

```cpp
42        // int
42u       // unsigned int
42L       // long
42ULL     // unsigned long long
1.5       // double
1.5f      // float（少了 f 就是 double）
```

寫 `1.5f` 而不是 `1.5` 有意義：`float` 只有 7 位有效數字，`double` 有 15 位。
把 double 塞進 float 會有精度損失（編譯器可能警告）。

## sizeof：位元組，不是位元

```cpp
sizeof(int)        // 4      ← 位元組
sizeof(int) * 8    // 32     ← 位元
sizeof(char)       // 1
sizeof(double)     // 8
```

`sizeof` 的型別是 `std::size_t`（無號），而且是**編譯期**就決定的常數
（`sizeof` 裡的運算式不會被求值）。

## int 到底多大？不要猜

標準只保證 `short <= int <= long <= long long` 的**相對**大小，
沒有規定 `int` 剛好 32 位。實例：

| 平台 | `sizeof(int)` | `sizeof(long)` |
|---|---|---|
| Windows / MinGW | 4 | 4 |
| Linux x64 | 4 | 8 |

要「一定是 32 位」就用 `<cstdint>`：

```cpp
#include <cstdint>
std::int32_t  a;   // 保證 32 位有號
std::uint64_t b;   // 保證 64 位無號
```

## 要極值就問 numeric_limits

```cpp
#include <limits>
std::numeric_limits<short>::min()   // -32768（不是 -32767！）
std::numeric_limits<short>::max()   // 32767
std::numeric_limits<int>::digits    // 31（有效位元數，不含符號位）
```

自己背極值幾乎一定會錯一位 —— 尤其是 `short` 的 `min()`。

## 位元運算：遮罩與位移

```cpp
unsigned v = 0x1234;
v & 0xFF;    // 0x34  取最低 8 位（遮罩）
v >> 8;      // 0x12  往高位位移
```

`&` 是「保留哪些位」、`>>` 是「移動幾位」。方向搞反是常見錯誤。

## 你要實作的部分

```cpp
int int_bits();                       // int 有幾個「位元」
bool fits_in_short(long long v);      // v 是否落在 short 的範圍
unsigned char low_byte(unsigned v);   // v 的最低 8 位（0..255）
```

起始碼三個地方漏了：`int_bits` 回了位元組數、`fits_in_short` 手寫的極值差一位、
`low_byte` 用位移取錯方向。
