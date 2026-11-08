// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

int safe_at(const std::vector<int>& v, std::size_t i) {
  if (i >= v.size()) {
    return 0;
  }
  return v[i];
}

int max_or_zero(const std::vector<int>& v) {
  if (v.empty()) {
    return 0;
  }
  int best = v[0];  // 用第一個元素當種子
  for (std::size_t i = 1; i < v.size(); ++i) {
    if (v[i] > best) {
      best = v[i];
    }
  }
  return best;
}

std::size_t count_above(const std::vector<int>& v, int threshold) {
  std::size_t n = 0;
  for (int x : v) {
    if (x > threshold) {
      ++n;
    }
  }
  return n;
}
