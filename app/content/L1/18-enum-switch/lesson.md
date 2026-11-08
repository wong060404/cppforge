# enum class 與 switch

「魔術數字」是指程式裡突然出現的 `0`、`1`、`2`，讀者只能猜它的意思。`enum class` 是把它換成名字的最小成本做法。

## C 式 enum vs enum class

```cpp
enum Direction { North, East, South, West };        // C 式
enum class Direction { North, East, South, West };  // C++11

int i = North;                 // C 式：偷偷變成整數 0（還污染全域命名）
int j = Direction::North;      // enum class：編譯錯誤
Direction d = 2;               // C 式：可以（d 變成 South，沒人攔你）
Direction e = 2;               // enum class：編譯錯誤
Direction f = static_cast<Direction>(2);  // 要轉就得明說
```

`enum class` 的三個好處：**具名作用域**、**不與整數隱式互轉**、**不會撞名**。代價是每次轉換要寫 `static_cast` —— 而這正是你要的保護。

## switch 與「窮舉檢查」

```cpp
std::string to_chinese(Direction d) {
  switch (d) {
    case Direction::North: return "北";
    case Direction::East:  return "東";
    case Direction::South: return "南";
    case Direction::West:  return "西";
  }                      // 沒有 default！
  return "?";
}
```

對 `enum` 的 switch，如果少了某個 case **又沒有 `default`**，GCC 的 `-Wswitch`（包含在 `-Wall`）會明確指出漏了哪個值。本課程把警告當錯誤，所以漏一個 case 就編不過 —— 編譯器成了你的窮盡性檢查器。

**但只要你寫了 `default:`，這個檢查就失效**。因為編譯器認為你處理了所有情況。所以：

> 窮舉式 switch 不要寫 default；真的需要 default 時，把它放在所有 case 之後並明確說明「這是不該發生的情況」。

## 「數值 +1」對 enum 是危險操作

```cpp
Direction turn_right(Direction d) {
  return static_cast<Direction>(static_cast<int>(d) + 1);   // West → 4（不存在！）
}
```

`West` 是 3，加一變 4 —— 那不是任何 `Direction`。之後你若對它 switch，沒有任何 case 接得住，行為完全沒定義。而且**編譯器不會警告**，因為 `static_cast` 已經是你「掛保證」的意思。

正確做法是先取模：

```cpp
constexpr int kCount = 4;
return static_cast<Direction>((static_cast<int>(d) + 1) % kCount);
```

## 你要實作的三個函式

```cpp
Direction turn_right(Direction d);      // 順時針 90 度（West 要繞回 North）
std::string to_chinese(Direction d);    // 「北」「東」「南」「西」
std::pair<int, int> delta(Direction d); // 北(0,1) 東(1,0) 南(0,-1) 西(-1,0)
```

起始碼：一個忘了取模、一個 switch 少了 `South` 而且用 `default` 蓋住、一個方位向量正負號寫反。
