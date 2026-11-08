// 起始碼：兩個函式都用「哨兵值」假裝「沒有答案」。
// 提示：0 是合法的索引；{0, 0} 對空 vector 也不是誠實的答案。
#include "tasks.hpp"

std::optional<std::size_t> find_first_above(const std::vector<int>& v, int threshold) {
  for (std::size_t i = 0; i < v.size(); ++i) {
    if (v[i] > threshold) {
      return i;
    }
  }
  return 0;  // 用 0 表示「找不到」——但 0 是合法索引
}

std::optional<std::pair<int, int>> min_max(const std::vector<int>& v) {
  int lo = 0;
  int hi = 0;
  for (std::size_t i = 0; i < v.size(); ++i) {
    if (v[i] < lo) {
      lo = v[i];
    }
    if (v[i] > hi) {
      hi = v[i];
    }
  }
  return std::pair<int, int>{lo, hi};  // 空 vector 會回傳 {0, 0}
}
