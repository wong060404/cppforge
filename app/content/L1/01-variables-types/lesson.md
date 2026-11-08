# 變數、型別與初始化

寫程式的第一步不是「寫邏輯」，是**決定每個值要用什麼型別存**。
型別選錯，程式可以編譯、可以執行，但答案會悄悄錯掉。

## 四種你會天天用的型別

| 型別 | 存什麼 | 範圍／精度 | 例 |
|---|---|---|---|
| `int` | 整數 | 約 ±21 億 | `int n = 42;` |
| `double` | 有小數的數 | 約 15 位有效數字 | `double avg = 1.5;` |
| `bool` | 真／假 | `true` / `false` | `bool ok = true;` |
| `std::string` | 文字 | 動態長度 | `std::string s = "hi";` |

選錯型別**不會**報錯。這就是它危險的地方：

```cpp
int a = 7, b = 2;
double c = a / b;      // c == 3.0，不是 3.5
```

原因：`a / b` 的兩邊都是 `int`，所以先做**整數除法**得到 `3`，之後才轉成 `double`。
要拿到 3.5，必須在**除法之前**把至少一邊變成浮點：

```cpp
double c = static_cast<double>(a) / b;   // 3.5
double d = 7.0 / 2;                      // 3.5（字面值就是 double）
```

這條規則會一直跟著你：**先看運算元的型別，再看結果要拿去做什麼。**

## 宣告與初始化

```cpp
int x;          // 宣告，但沒有值 —— 區域變數的值是「不定的」
int y = 0;      // 初始化
int z{};        // 值初始化（歸零）—— 現代 C++ 推薦寫法
```

讀取未初始化的值是**未定義行為**。它常常「剛好是 0」，讓你以為沒事，
換一台機器或改個優化等級就爆掉。習慣：**宣告時就給值**。

## const 與 auto

```cpp
const int kMax = 100;      // 之後不能改，改了編譯不過
auto  count = 0;           // 讓編譯器推導型別（這裡是 int）
auto  ratio = 1.0 / 3;     // double
```

`const` 不是裝飾 —— 它把「這個值不該變」變成編譯器幫你檢查的事實。
`auto` 是省打字，不是省思考：你還是要知道推導出來是什麼型別。

## bool 與整數的隱式轉換（常見 bug）

```cpp
bool is_even(int x) {
  return x % 2;            // ❌ x % 2 是 int（0 或 1），奇數 → true
}

bool is_even(int x) {
  return x % 2 == 0;       // ✅ 回傳的是比較結果
}
```

`0` 會轉成 `false`、非 0 轉成 `true`。所以任何「回傳 `bool` 但寫了算術運算式」
的地方都值得多看一眼。

## 你要實作的部分

```cpp
double average3(int a, int b, int c);      // 三個整數的平均（要有小數）
bool   is_even(int x);                     // x 是否為偶數
std::string describe_sign(int x);          // "negative" / "zero" / "positive"
```

起始碼三個地方漏了：平均值用了整數除法、`is_even` 回傳餘數而不是比較結果、
`describe_sign` 把 0 判成正數。
