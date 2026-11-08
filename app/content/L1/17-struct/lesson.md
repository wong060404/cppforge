# struct：把相關的資料綁在一起

`struct` 是 C++ 最被低估的工具。多數人以為它是「沒有方法的類別」（雖然技術上 `struct` 的成員預設 public），但它真正的價值是**讓型別系統替你說明語意**。

## 一長串同型別參數是 bug 溫床

```cpp
int distance(int x1, int y1, int x2, int y2);   // 哪個是哪個？
distance(a.x, b.x, a.y, b.y);                   // 順序錯 → 編譯器不會發現
```

四個 `int` 對編譯器來說長得一模一樣。改成：

```cpp
struct Point { int x; int y; };
int manhattan(Point a, Point b);
manhattan({0, 0}, {3, 4});                      // 想傳錯順序都不可能
```

## 聚合初始化

```cpp
Point p{3, 4};              // 依序初始化 x, y
Point q = {3, 4};           // 同上（複製列表初始化）
Rect r{{0, 0}, {3, 4}};     // 巢狀也可以
r.top_left.x;               // 3
```

`struct` 沒有使用者定義的建構子時叫「聚合型別」，可以用大括號直接填成員。這讓它幾乎沒有使用成本。

## 傳值還是傳參考

| 寫法 | 何時用 |
|---|---|
| `Point p`（傳值） | 小型、便宜複製（兩個 int） |
| `const Point& p` | 結構較大、或不想複製 |
| `Point& p` | 要就地修改 |

`Point` 只有 8 位元組，傳值反而可能更快（不用解參考）。`Rect` 有 16 位元組，也還算小 —— 但**介面的一致性**更重要：本節統一用 `const&` 傳 struct，除了 `Point`（刻意示範傳值）。

## 退化輸入：反向矩形

```cpp
Rect r{{10, 10}, {2, 2}};    // 左上角在右下角的右下方
```

這種矩形面積該算多少？如果你直接寫 `(br.x - tl.x) * (br.y - tl.y)`，會得到正數（兩個負數相乘）—— 看起來「有答案」，但那不是這個矩形。

正確做法是**明確處理**：

```cpp
if (r.bottom_right.x < r.top_left.x || r.bottom_right.y < r.top_left.y) return 0;
```

教學重點不是「記得加這個 if」，而是：**每個 struct 參數都可能有不合法組合，介面必須定義行為**。這裡定義成 0，並寫進測試。

## 你要實作的三個函式

```cpp
int manhattan(Point a, Point b);
int rect_area(const Rect& r);              // 反向矩形回傳 0
bool rect_contains(const Rect& r, Point p); // 含邊界
```

起始碼：一個距離公式寫錯、一個沒處理反向矩形、一個邊界用嚴格小於。
