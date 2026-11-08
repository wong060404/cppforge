// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

int sum_array(const std::array<int, 5>& a) {
  int total = 0;
  for (std::size_t i = 0; i < a.size(); ++i) {
    total += a[i];
  }
  return total;
}

void reverse_array(std::array<int, 5>& a) {
  for (std::size_t i = 0; i < a.size() / 2; ++i) {   // 只走前半
    const int tmp = a[i];
    a[i] = a[a.size() - 1 - i];
    a[a.size() - 1 - i] = tmp;
  }
}

std::size_t index_of_max(const std::array<int, 5>& a) {
  std::size_t best = 0;                              // 記索引
  for (std::size_t i = 1; i < a.size(); ++i) {
    if (a[i] > a[best]) {
      best = i;                                      // 嚴格大於 → 保留最前面那個
    }
  }
  return best;
}
