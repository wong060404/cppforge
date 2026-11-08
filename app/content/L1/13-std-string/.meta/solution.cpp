// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

std::string join(const std::vector<std::string>& parts, const std::string& sep) {
  std::string out;
  for (std::size_t i = 0; i < parts.size(); ++i) {
    if (i > 0) {
      out += sep;   // 從第二個元素開始才補
    }
    out += parts[i];
  }
  return out;
}

std::size_t count_char(const std::string& s, char c) {
  std::size_t n = 0;
  for (char ch : s) {
    if (ch == c) {
      ++n;
    }
  }
  return n;
}

std::string trim(const std::string& s) {
  constexpr const char* kSpace = " \t\n\r\v\f";
  const auto first = s.find_first_not_of(kSpace);
  if (first == std::string::npos) {
    return "";   // 整串都是空白
  }
  const auto last = s.find_last_not_of(kSpace);
  return s.substr(first, last - first + 1);
}
