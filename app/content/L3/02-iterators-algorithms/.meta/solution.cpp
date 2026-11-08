// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <algorithm>

std::size_t count_even(const std::vector<int>& v) {
  const auto n = std::count_if(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
  return static_cast<std::size_t>(n);
}

std::vector<int> sorted_copy(const std::vector<int>& v) {
  std::vector<int> out = v;        // 先複製（不改動呼叫者的 vector）
  std::sort(out.begin(), out.end());
  return out;
}

bool any_negative(const std::vector<int>& v) {
  return std::any_of(v.begin(), v.end(), [](int x) { return x < 0; });
}

int max_or_zero(const std::vector<int>& v) {
  const auto it = std::max_element(v.begin(), v.end());
  if (it == v.end()) {
    return 0;                      // 空容器：max_element 回傳 end()
  }
  return *it;
}
