// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

int sum_first_n(const std::vector<int>& values, std::size_t n) {
  // 關鍵：把邊界夾在 [0, values.size()]，這樣 n 再大也不會越界
  const std::size_t limit = n < values.size() ? n : values.size();
  int total = 0;
  for (std::size_t i = 0; i < limit; ++i) {
    total += values[i];
  }
  return total;
}
