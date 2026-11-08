// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

long long sum_range(int from, int to) {
  if (from >= to) {
    return 0;
  }
  long long total = 0;
  for (int i = from; i < to; ++i) {  // 半開區間
    total += i;
  }
  return total;
}

std::string fizz_buzz(int n) {
  if (n <= 0) {
    return "";
  }
  std::string out;
  for (int i = 1; i <= n; ++i) {
    // 最特殊的條件放最前面
    if (i % 15 == 0) {
      out += "FizzBuzz";
    } else if (i % 3 == 0) {
      out += "Fizz";
    } else if (i % 5 == 0) {
      out += "Buzz";
    } else {
      out += std::to_string(i);
    }
    if (i != n) {
      out += ",";
    }
  }
  return out;
}
