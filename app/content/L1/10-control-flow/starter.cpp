// 起始碼：兩個函式各有一個控制流錯誤。
// 提示：一個是區間端點，一個是條件順序。
#include "tasks.hpp"

long long sum_range(int from, int to) {
  long long total = 0;
  for (int i = from; i <= to; ++i) {  // 閉區間？題目要的是半開區間
    total += i;
  }
  return total;
}

std::string fizz_buzz(int n) {
  std::string out;
  for (int i = 1; i <= n; ++i) {
    if (i % 3 == 0) {
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
