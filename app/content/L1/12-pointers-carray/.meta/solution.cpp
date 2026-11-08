// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

const int* next(const int* p) {
  return p + 1;   // 指標算術的單位是元素
}

const int* find_value(const int* begin, const int* end, int target) {
  for (const int* p = begin; p < end; ++p) {
    if (*p == target) {
      return p;
    }
  }
  return nullptr;   // 找不到要明確表示
}

std::size_t flat_index(std::size_t row, std::size_t col, std::size_t cols) {
  return row * cols + col;   // row-major
}
