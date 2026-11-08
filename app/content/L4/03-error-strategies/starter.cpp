// 起始碼：三個函式各自違反自己的契約。
// 提示：一個直接呼叫 stoi（會拋例外、也會接受 "12x"）、
//       一個把例外吞掉（於是永不失敗）、一個永遠說成功。
#include "tasks.hpp"

std::optional<int> to_int_opt(const std::string& s) {
  return std::stoi(s);  // 空字串、溢位都會丟例外；"12x" 會被當成 12
}

int to_int_or_throw(const std::string& s) {
  try {
    return std::stoi(s);
  } catch (...) {
    return 0;  // 吞掉例外 → 這個函式永遠不會失敗
  }
}

ParseOutcome to_int_outcome(const std::string& s) {
  return ParseOutcome{true, std::stoi(s)};  // 永遠 ok = true
}
