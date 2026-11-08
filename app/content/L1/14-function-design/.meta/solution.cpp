// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

std::optional<std::size_t> find_first_above(const std::vector<int>& v, int threshold) {
  for (std::size_t i = 0; i < v.size(); ++i) {
    if (v[i] > threshold) {
      return i;
    }
  }
  return std::nullopt;   // 誠實表達「沒有答案」
}

std::optional<std::pair<int, int>> min_max(const std::vector<int>& v) {
  if (v.empty()) {
    return std::nullopt;
  }
  int lo = v[0];
  int hi = v[0];
  for (std::size_t i = 1; i < v.size(); ++i) {
    if (v[i] < lo) {
      lo = v[i];
    }
    if (v[i] > hi) {
      hi = v[i];
    }
  }
  return std::pair<int, int>{lo, hi};
}
