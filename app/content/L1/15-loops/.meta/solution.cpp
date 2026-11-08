// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <cctype>

long long factorial(int n) {
  long long result = 1;              // 乘法的單位元素
  for (int i = 2; i <= n; ++i) {
    result *= i;
  }
  return result;
}

bool is_prime(int n) {
  if (n < 2) {
    return false;
  }
  if (n == 2) {
    return true;                     // 2 是唯一的偶數質數
  }
  if (n % 2 == 0) {
    return false;
  }
  for (int d = 3; d * d <= n; d += 2) {
    if (n % d == 0) {
      return false;
    }
  }
  return true;
}

std::optional<std::size_t> first_non_space(const std::string& s) {
  for (std::size_t i = 0; i < s.size(); ++i) {
    if (std::isspace(static_cast<unsigned char>(s[i])) == 0) {
      return i;
    }
  }
  return std::nullopt;
}
