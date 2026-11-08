// 起始碼：三個地方「差一個單位」，而且都能編譯。
// 提示：指標算術的單位是元素、找不到要回 nullptr、row-major 的權重。
#include "tasks.hpp"

const int* next(const int* p) {
  return p + sizeof(int);   // 單位搞錯了：這樣是往前 4 個元素
}

const int* find_value(const int* begin, const int* end, int target) {
  for (const int* p = begin; p < end; ++p) {
    if (*p == target) {
      return p;
    }
  }
  return begin;   // 找不到卻回 begin：呼叫端無法分辨
}

std::size_t flat_index(std::size_t row, std::size_t col, std::size_t cols) {
  return col * cols + row;   // row 與 col 寫反了
}
