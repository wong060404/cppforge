#pragma once
// 這個介面不可修改：你只能實作它。
#include <optional>
#include <stdexcept>
#include <string>

// 解析規則（三個函式共用）：
//   - 可選一個 '+' 或 '-'，後面接一或多個十進位數字
//   - 整串都必須被解析（不可以有前後空白或多餘字元）
//   - 超出 int 範圍視為失敗

// ① 失敗回 nullopt；**絕不拋出例外**
std::optional<int> to_int_opt(const std::string& s);

// ② 失敗丟 std::invalid_argument
int to_int_or_throw(const std::string& s);

// ③ 錯誤碼：失敗時 ok == false（value 無意義）；**絕不拋出例外**
struct ParseOutcome {
  bool ok;
  int value;
};
ParseOutcome to_int_outcome(const std::string& s);
