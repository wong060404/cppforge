// 起始碼：這份程式碼「編不過」。先讀訊息，把缺的字元補上。
#include "tasks.hpp"

int sum_first_n(const std::vector<int>& values, std::size_t n) {
  int total = 0;
  for (std::size_t i = 0; i < n; ++i) {
    total += values[i]
  }
  return total;
}
