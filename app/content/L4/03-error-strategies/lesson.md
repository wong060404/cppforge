# 錯誤處理策略：同一件事，三種契約

「把字串解析成整數」可以寫成三種介面。它們做的事一樣，**承諾**完全不同。

```cpp
std::optional<int> to_int_opt(const std::string&);   // 失敗 → nullopt，絕不拋
int to_int_or_throw(const std::string&);             // 失敗 → std::invalid_argument
struct ParseOutcome { bool ok; int value; };
ParseOutcome to_int_outcome(const std::string&);     // 失敗 → ok = false，絕不拋
```

三種都合理。差別在**呼叫端要付出什麼代價**。

## 三種契約的取捨

| 契約 | 呼叫端要寫 | 適合 |
|---|---|---|
| `optional` | `if (auto v = f(s)) { ... }` | 失敗是常態（查詢、解析使用者輸入） |
| 例外 | 不用寫（但要保證有地方 catch） | 失敗是異常（檔案、記憶體、網路） |
| 錯誤碼 | `auto r = f(s); if (!r.ok) ...` | 不能拋例外的環境、需要豐富錯誤資訊 |

真正的判斷點是：**呼叫端能不能在這裡處理失敗？**

- 能，而且很常見 → `optional`（不要用例外逼他寫 try/catch）
- 不能，必須往上傳 → 例外（不要用錯誤碼逼每一層轉發）
- 不能拋（ABI 邊界、`noexcept` 環境）→ 錯誤碼

## 契約是合約，不是建議

介面寫「絕不拋例外」，就是承諾**所有輸入**都不拋。

```cpp
std::optional<int> to_int_opt(const std::string& s) {
  return std::stoi(s);      // ❌ 空字串丟 invalid_argument、溢位丟 out_of_range
}
```

呼叫端看到 `optional` 就假設不會拋，所以**沒有寫 try/catch**。一旦真的拋：

```
例外一路穿過呼叫端 → 沒有 catch → std::terminate
```

這比「回傳錯誤碼」更危險，因為失敗路徑完全沒被預期。

## `std::stoi` 的兩個陷阱

```cpp
std::stoi("12x");     // 12（只解析到第一個非數字，不報錯）
std::stoi("");        // 丟 invalid_argument
std::stoi("99999999999");   // 丟 out_of_range
```

要確認「整串都被解析完」，必須用帶 `pos` 的版本：

```cpp
std::size_t pos = 0;
int v = std::stoi(s, &pos);
if (pos != s.size()) { /* 有多餘字元 */ }
```

這也是為什麼很多人選擇**自己逐字元解析**：行為完全可預測，而且不拋例外。

## 魔法值不是錯誤碼

```cpp
int parse(const std::string& s);   // 失敗回 -1？
```

`-1` 是合法值。呼叫端無法區分「解析出 -1」與「失敗」。要嘛用 `optional`，
要嘛明確分開「有沒有值」與「值是什麼」：

```cpp
struct ParseOutcome { bool ok; int value; };
```

## 你要實作的部分

三種契約、同一套規則：可選的正負號 + 一或多個十進位數字，整串都要是數字，
不可有空白，超出 `int` 範圍算失敗。

起始碼三個地方漏了：`to_int_opt` 直接回傳 `std::stoi`（會拋例外、也會接受 `"12x"`）、
`to_int_or_throw` 把例外吞掉改回 0（變成「永不失敗」）、
`to_int_outcome` 永遠回 `ok = true`。
