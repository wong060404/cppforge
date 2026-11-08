# 建構子與解構函式：誰配置，誰釋放

到目前為止你寫的函式都是「進去、算完、出來」。這一節開始，物件有**壽命**。

## 生命週期的四個時機

```cpp
{
  Buffer b(10);          // ① 建構子：取得資源
  b.set(0, 42);
  process(b);
  if (error) return;     // ② 提早 return：解構子
  throw std::runtime_error("x");  // ③ 拋例外：解構子（stack unwinding）
}                        // ④ 離開 scope：解構子
```

編譯器**保證**這四種路徑都會呼叫解構函式。這一點非常重要，因為它意味著：只要你把「釋放」寫在解構函式裡，就不可能在錯誤路徑漏掉。

這叫 **RAII**（Resource Acquisition Is Initialization）：資源的取得與物件的誕生綁在一起，資源的釋放與物件的死亡綁在一起。

## 最小可用的手寫版本

```cpp
Buffer::Buffer(std::size_t n) : data_(new int[n]()), size_(n) {}
Buffer::~Buffer() { delete[] data_; }
```

兩個細節：

- **`new int[n]()` 的那對括號**代表值初始化 → 全部設為 0。少了它，元素是未初始化的垃圾值。
- **`delete[]` 不是 `delete`**。用錯在 `int` 上通常「看起來沒事」（記憶體還是被釋放了），但對有解構函式的型別就是未定義行為。這是那種「在你機器上能跑」的錯。

## 為什麼這種寫法危險

手寫 `new`/`delete` 的類別只要漏一件就會出事：

| 漏掉的事 | 後果 |
|---|---|
| 解構函式裡忘了 `delete[]` | 記憶體洩漏（本節的錯誤之一） |
| 沒禁用複製 | 兩個物件指向同一塊記憶體 → double free |
| 沒處理自我賦值 | `b = b;` 先刪掉自己的資料再用它 |

這就是 **rule of three**：只要你寫了「解構函式、複製建構子、複製賦值」其中之一，另外兩個通常也得寫（或者明確 `= delete`）。

本節先用 `= delete` 把複製關掉，讓編譯器幫你擋。下一節改用 `std::unique_ptr` —— 那時你連解構函式都不用寫。

## 你要實作的部分

```cpp
explicit Buffer(std::size_t n);   // 配置 n 個 int，全部為 0
~Buffer();                        // 釋放
void set(std::size_t i, int v);   // i >= size() → throw std::out_of_range
int  at(std::size_t i) const;     // i >= size() → throw std::out_of_range
std::size_t size() const;
```

起始碼：解構函式沒釋放、`set()` 與 `at()` 都少了邊界檢查。

> 評測會用洩漏檢查跑一次測試。這是本課程唯一能抓到「忘記 delete」的手段 ——
> Windows 上的 MinGW 沒有 ASan，所以我們用 `operator new` 攔截來做（見 POC 報告 §3）。
