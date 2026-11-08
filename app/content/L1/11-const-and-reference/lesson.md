# const 與參考

「我明明在函式裡改了，為什麼外面沒變？」——這是初學 C++ 最常撞的牆。

## 三種參數傳遞方式

```cpp
void by_value(std::string s);              // 複製一份進來，改的是副本
void by_ref(std::string& s);               // 直接參考呼叫者的變數，改了就是改了
void by_const_ref(const std::string& s);   // 參考但不可修改，也不會複製
```

| 寫法 | 會複製嗎 | 能改呼叫者嗎 | 典型用途 |
|---|---|---|---|
| `T x` | 會 | 不能 | 小型、可便宜複製的型別（`int`、指標） |
| `T& x` | 不會 | 能 | 輸出參數、就地修改（`swap`、`append`） |
| `const T& x` | 不會 | 不能 | 唯讀的大型物件（`std::string`、`std::vector`） |

**預設用 `const&`，需要寫入時才拿掉 const** —— 這是 C++ 社群的共識。理由不只是效能：

1. 呼叫者知道「這個函式不會改我的資料」。
2. 編譯器幫你檢查，改了就報錯。
3. 它可以接受 `const` 物件；非 const 參考不能。

## 但「能改」不等於「改對了」

拿到 `T&` 之後，最常見的兩種錯都不會被編譯器攔下來：

### 錯誤一：改了副本

```cpp
void add_bang(std::string& s) {
  std::string result = s;
  result.push_back('!');
  // 忘了把 result 寫回 s —— 編譯器不會有任何意見
}
```

`result` 是區域變數，函式結束就消失。編譯器只看型別，看不出「你忘了寫回」。

### 錯誤二：覆蓋掉原值

```cpp
void swap_ints(int& a, int& b) {
  a = b;   // 這行就把 a 的原值毀了
  b = a;   // 所以這裡拿到的是 b 的新值
}
```

正確版本需要暫存變數（這也是 `std::swap` 存在的原因）：

```cpp
const int tmp = a;
a = b;
b = tmp;
```

> 這兩個錯誤的共同點：**語法完全合法**。
> C++ 只保證型別正確，不保證語意正確 —— 語意要靠測試。

## 你要實作的四個函式

```cpp
std::size_t length_of(const std::string& s);   // 唯讀，不可複製
void add_bang(std::string& s);                 // 就地修改：尾巴加 '!'
void swap_ints(int& a, int& b);                // 就地修改：交換兩數
long long total_of(const std::vector<int>& v); // 唯讀，不可複製
```

起始碼中 `length_of` 與 `total_of` 是對的；`add_bang` 與 `swap_ints` 各犯了上面其中一個錯。
測試會從**呼叫者那一側**驗證，所以你改副本、或覆蓋原值，都躲不掉。
