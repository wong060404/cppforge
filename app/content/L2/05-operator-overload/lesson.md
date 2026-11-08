# 運算子重載：讓型別講自己的語言

`Vec2 a, b; a += b;` 比 `a.add(b);` 好在哪裡？差別不大。但 `std::cout << v` 和 `v1 == v2` 就不一樣了 —— 它們讓你的型別**融入語言的既有語法**，而呼叫端不必記住你發明了哪些函式名。

## 兩種寫法：成員 vs 自由函式

```cpp
class Vec2 {
 public:
  Vec2& operator+=(const Vec2& other);   // 成員：左邊一定是 Vec2
  bool operator==(const Vec2& other) const;
 private:
  int x_, y_;
};

std::ostream& operator<<(std::ostream& os, const Vec2& v);   // 自由函式
```

判斷規則只有一條：**左運算元是誰？**

| 運算子 | 左運算元 | 寫成 |
|---|---|---|
| `+=`、`==`、`[]`、`()` | 自己的型別 | 成員函式 |
| `<<`、`>>` | `std::ostream` / `std::istream` | 自由函式 |
| `+`、`-`（二元） | 自己的型別，但兩邊都想支援隱式轉換 | 通常自由函式 |

`std::cout << v` 的左邊是 `std::ostream`，不可能寫成 `Vec2` 的成員函式 —— 這就是為什麼 `operator<<` **一定**是自由函式。

## `+=` 為什麼要回傳參考

```cpp
Vec2& Vec2::operator+=(const Vec2& other) {
  x_ += other.x_;
  y_ += other.y_;
  return *this;          // ← 回傳自己
}
```

回傳 `Vec2&`（而不是 `Vec2`）的理由：

1. **鏈式運算**：`(a += b) += c;` 需要 `a += b` 的結果還是 `a` 本身。
2. **與內建型別一致**：`(i += 1) += 2` 在 `int` 上是合法的。
3. **避免複製**：回傳值會多做一次複製（雖然編譯器常能省略）。

## 完整更新：不是「更新一半」

```cpp
// 錯：只加了 x
Vec2& operator+=(const Vec2& o) { x_ += o.x_; return *this; }
```

這種錯最陰險的地方是：`Vec2(0, 0) += Vec2(3, 4)` 之後 `y` 還是 0，但物件仍然「看起來正常」。沒有測試去檢查 `y`，就永遠不會發現。

## `operator<<` 的格式也是規格

```cpp
std::ostream& operator<<(std::ostream& os, const Vec2& v) {
  return os << "(" << v.x() << ", " << v.y() << ")";
}
```

輸出 `(1, 2)` 而不是 `1 2`，差別在於**可讀性**：

- 除錯時 `(1, 2) + (3, 4) = (4, 6)` 一眼看得懂。
- 日誌裡 `1 2` 會讓人以為是兩個數字。

一旦你決定 `<<` 的格式，它就是**介面的一部分** —— 之後的測試、報表、日誌都會依賴它。所以本節會用 `std::ostringstream` 精確驗證輸出字串。

## 你要實作的部分

```cpp
class Vec2 {
 public:
  Vec2(int x, int y);
  int x() const;
  int y() const;
  Vec2& operator+=(const Vec2& other);     // 兩軸都要加，回傳 *this
  bool operator==(const Vec2& other) const; // 兩軸都要相等
  double length() const;                    // sqrt(x² + y²)
};

std::ostream& operator<<(std::ostream& os, const Vec2& v);   // 格式 "(x, y)"
```

起始碼三個地方漏了：`+=` 只加了一軸、`==` 只比了一軸、`<<` 的格式少了括號與逗號。

> 提示：`length()` 在起始碼裡是**對的**。不是每個函式都一定有錯 ——
> 這在真實程式碼裡也是常態，你的工作是找出「哪幾個」而不是「全部重寫」。
