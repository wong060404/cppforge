// 起始碼：三個函式各有一個錯。
// 提示：一個多補了分隔符，一個只回報「有沒有」，一個只認得空格。
#include "tasks.hpp"

std::string join(const std::vector<std::string>& parts, const std::string& sep) {
  std::string out;
  for (const auto& p : parts) {
    out += p;
    out += sep;  // 最後一個元素後面也補了
  }
  return out;
}

std::size_t count_char(const std::string& s, char c) {
  // 只回報「出現過」而不是「出現幾次」
  return s.find(c) == std::string::npos ? 0 : 1;
}

std::string trim(const std::string& s) {
  // 只處理空格，漏掉 Tab 與換行
  const auto first = s.find_first_not_of(' ');
  if (first == std::string::npos) {
    return "";
  }
  const auto last = s.find_last_not_of(' ');
  return s.substr(first, last - first + 1);
}
