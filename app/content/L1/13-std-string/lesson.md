# std::string：拼接、計數、修剪

`std::string` 是 C++ 最被低估的型別。它自己管理記憶體、可以增長、能安全複製 —— 但它的行為有幾個地方跟直覺不合。

## size() 算的是位元組

```cpp
std::string s = "中";
s.size();        // 3（UTF-8 是三個位元組）
```

C++ 的 `std::string` 是一串**位元組**，不是一串「字」。它不知道什麼是 UTF-8 字元邊界。要處理真正的文字（截斷、反轉、計算字數），你需要在 L6 之後用專門的函式庫，或在 L1 先用 ASCII 思考。

> 這個坑在真實專案裡非常貴：用 `substr` 截斷中文字串，會切出無效的 UTF-8。

## 拼接：小心尾端分隔符

錯誤示範（每輪都補分隔符）：

```cpp
for (const auto& p : parts) {
  out += p;
  out += sep;      // 最後一個元素後面也會補
}
// "a-b-c-"  ← 多了一個
```

兩種正確寫法：

```cpp
// 寫法一：第一個之前不補
for (std::size_t i = 0; i < parts.size(); ++i) {
  if (i > 0) out += sep;
  out += parts[i];
}

// 寫法二：先補再刪
out.pop_back();    // 只有確定 parts 非空才能這樣做
```

寫法二很常見但危險：`parts` 是空的時候 `pop_back()` 是未定義行為。**先檢查空容器**，或用寫法一。

## trim：空白不只一種

```cpp
' '   // 空格
'\t'  // Tab
'\n'  // 換行
'\r'  // 回車（Windows 的 CRLF 會留下它）
'\v'  // 垂直 Tab
'\f'  // 換頁
```

只處理空格是新手最常見的錯，尤其在讀 Windows 文字檔時 —— `\r` 會留下來，讓你之後的比對全部失敗。

安全做法是明確列出你要修剪的字元，並且處理「整串都是空白」的情況：

```cpp
const auto first = s.find_first_not_of(" \t\n\r\v\f");
if (first == std::string::npos) return "";   // 全是空白
const auto last = s.find_last_not_of(" \t\n\r\v\f");
return s.substr(first, last - first + 1);
```

## 你要實作的三個函式

```cpp
// 用 sep 連接 parts；空 vector 回傳空字串
std::string join(const std::vector<std::string>& parts, const std::string& sep);

// 計算 c 在 s 中出現的次數（大小寫敏感）
std::size_t count_char(const std::string& s, char c);

// 移除前後的空白/Tab/換行；全是空白時回傳空字串
std::string trim(const std::string& s);
```

三個起始碼各有一個錯：`join` 多補了一次分隔符、`count_char` 只回報「有沒有」、`trim` 只認得空格。
