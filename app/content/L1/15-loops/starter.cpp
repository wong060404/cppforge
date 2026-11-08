// 起始碼：三個函式各有一個錯。
// 提示：一個累乘起始值錯了、一個特例判斷錯了、一個找的是「空白」不是「非空白」。
#include "tasks.hpp"

long long factorial(int n) {
  long long result = 0;  // 累乘的起始值
  for (int i = 1; i <= n; ++i) {
    result *= i;
  }
  return result;
}

bool is_prime(int n) {
  if (n < 2) {
    return false;
  }
  if (n % 2 == 0) {
    return false;  // 連 n == 2 也被判掉了
  }
  for (int d = 3; d * d <= n; d += 2) {
    if (n % d == 0) {
      return false;
    }
  }
  return true;
}

std::optional<std::size_t> first_non_space(const std::string& s) {
  const auto pos = s.find(' ');  // 找的是空白，不是非空白
  if (pos == std::string::npos) {
    return std::nullopt;
  }
  return pos;
}
