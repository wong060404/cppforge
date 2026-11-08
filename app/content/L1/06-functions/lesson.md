# 函式：參數、回傳值與「改到呼叫者」

函式是程式碼的**單位**：一個名字、一組輸入、一個輸出。
這一節只講最基礎但最常錯的一件事：**參數是副本還是本體**。

## 三件角色

```cpp
// 宣告（放在標頭檔）：只說「長什麼樣」
int  add(int a, int b);
void divmod(int a, int b, int& q, int& r);

// 定義（放在 .cpp）：給出實作
int add(int a, int b) { return a + b; }

// 呼叫
int s = add(3, 4);
```

宣告讓**別人**能用你的函式；定義讓**連結器**能接起來。少任何一個都會出錯
（少了宣告 → 編譯錯誤；少了定義 → 連結錯誤，這在 L0.03 看過）。

## 傳值：拿到的是副本

```cpp
void f(int x) { x = 99; }      // 改的是副本

int n = 1;
f(n);                          // n 還是 1
```

參數是 `int x`（沒有 `&`）就是複製一份進來。函式結束時副本消失，呼叫端不受影響。

## 傳參考：改到呼叫者

```cpp
void f(int& x) { x = 99; }     // x 是呼叫端那個變數的別名

int n = 1;
f(n);                          // n 變成 99
```

`&` 在這裡不是「取址」，而是「這是參考」：同一個變數的另一個名字。

用參考回傳多個結果是常見手法：

```cpp
void divmod(int a, int b, int& q, int& r) {
  q = a / b;      // 寫進呼叫者的變數
  r = a % b;
}

int q = 0, r = 0;
divmod(17, 5, q, r);    // q == 3, r == 2
```

初學者最常犯的錯：在函式裡 `int q = a / b;` —— 那只是建立一個**新的區域變數**，
函式結束就消失，呼叫端的 `q` 一點都沒變。

## range-for 的參考

```cpp
for (int x : v)        { x *= 2; }   // ❌ 改副本
for (int& x : v)       { x *= 2; }   // ✅ 改本體
for (const int& x : v) { use(x); }   // ✅ 只讀，避免複製
```

`const T&` 不會被複製，又保證你改不動它 —— 讀大物件時的預設寫法。

## 區域變數的壽命

```cpp
int& bad() {
  int local = 5;
  return local;        // ❌ local 在函式結束就沒了
}
```

回傳區域變數的參考 = 懸空參考。編譯器通常會警告（`-Wreturn-local-addr`），
但這類錯誤也可能悄無聲息。**回傳值，不要回傳區域變數的參考。**

## 你要實作的部分

```cpp
void divmod(int a, int b, int& quotient, int& remainder);  // 寫進參考參數
std::string repeat(const std::string& s, int times);       // times <= 0 → ""
void scale_in_place(std::vector<int>& v, int factor);      // 就地乘 factor
```

起始碼三個地方漏了：`divmod` 把結果寫進區域變數、`repeat` 完全沒用 `times`、
`scale_in_place` 用 `for (int x : v)`（改到副本）。
