// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

namespace {

// 一個共用的解析核心：不拋例外、整串檢查、含範圍檢查
bool parse_int(const std::string& s, int& out) {
  if (s.empty()) {
    return false;
  }
  std::size_t i = 0;
  bool negative = false;
  if (s[0] == '+' || s[0] == '-') {
    negative = (s[0] == '-');
    i = 1;
  }
  if (i == s.size()) {
    return false;   // 只有符號，沒有數字
  }
  long long acc = 0;
  for (; i < s.size(); ++i) {
    const char c = s[i];
    if (c < '0' || c > '9') {
      return false;
    }
    acc = acc * 10 + (c - '0');
    if (acc > 2147483648LL) {
      return false;   // 提早停止，避免 long long 也溢位
    }
  }
  if (negative) {
    acc = -acc;
  }
  if (acc < -2147483648LL || acc > 2147483647LL) {
    return false;
  }
  out = static_cast<int>(acc);
  return true;
}

}  // namespace

std::optional<int> to_int_opt(const std::string& s) {
  int v = 0;
  if (!parse_int(s, v)) {
    return std::nullopt;
  }
  return v;
}

int to_int_or_throw(const std::string& s) {
  int v = 0;
  if (!parse_int(s, v)) {
    throw std::invalid_argument("to_int: not a valid int");
  }
  return v;
}

ParseOutcome to_int_outcome(const std::string& s) {
  int v = 0;
  if (!parse_int(s, v)) {
    return ParseOutcome{false, 0};
  }
  return ParseOutcome{true, v};
}
