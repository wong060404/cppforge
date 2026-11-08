# class 與不變式

`struct` 只是把資料綁在一起。`class` 多了一件事：**規則**。

## 封裝不是「藏起來」，是「讓壞狀態無法存在」

```cpp
struct Counter { int value; int max; };      // 任何人都能寫 c.value = -999;
```

開放成員的問題不是「沒禮貌」，而是**你無法對它做任何保證**。任何拿到這個物件的人都能把它弄成不合法狀態，於是每個使用它的地方都得重新檢查。

```cpp
class Counter {
 public:
  explicit Counter(int max_value);
  void increment();
  void add(int n);
  int value() const;
  int max_value() const;
  bool is_full() const;
 private:
  int value_ = 0;
  int max_ = 0;
};
```

現在 `value_` 只能透過成員函式改變。於是你可以保證：

> **不變式**：任何時候 `0 <= value_ <= max_`

這不只是一句話，而是一份**所有成員函式都必須履行的合約**。

## 三個地方會破壞不變式

| 成員函式 | 常見錯誤 | 正確行為 |
|---|---|---|
| 建構子 | 不檢查 `max_value` | `max_value <= 0` → 丟 `std::invalid_argument` |
| `increment()` | 直接 `++value_` | 到頂就停（不拋例外，滿了是合法狀態） |
| `add(n)` | 接受負數 | `n < 0` → 丟 `std::invalid_argument`，超出上限則夾住 |

注意 `increment()` 與 `add()` 對「超過上限」的處理不同：**滿了不是錯誤**，所以夾住；**負數增量是錯誤**，所以丟例外。介面必須把這個差別寫清楚 —— 這也是為什麼參數驗證與狀態夾取要分開想。

## const 成員函式

```cpp
int value() const { return value_; }      // 標了 const
```

兩個作用：

1. **可用性**：`const Counter& c` 只能呼叫 const 成員函式。少了 const，連讀都不行。
2. **契約**：編譯器會拒絕你在裡面修改成員。

經驗法則：**不會改成員的成員函式，一律標 const**。這條規則沒有例外。

## 為什麼用例外而不是回傳錯誤碼

```cpp
Counter c(0);        // 丟例外，物件根本不存在
```

錯誤碼的問題是「可以被忽略」：

```cpp
Counter c(0);        // 假設回傳 bool，而呼叫端沒檢查
c.add(5);            // 現在 c 處於不合法的初始狀態
```

例外讓「不合法狀態」根本無法被構造出來 —— 建構子失敗就沒有物件。這叫 **RAII 的前半段**：資源（這裡是「合法的狀態」）在取得時就驗證。

## 你要實作的部分

```cpp
explicit Counter(int max_value);   // max_value <= 0 → throw std::invalid_argument
void increment();                  // 到 max_ 就停
void add(int n);                   // n < 0 → throw std::invalid_argument；超過上限夾到 max_
int value() const;
int max_value() const;
bool is_full() const;              // value_ == max_
```

起始碼三個地方漏了：constructor 沒驗證、`increment()` 沒夾住、`add()` 沒拒絕負數。
