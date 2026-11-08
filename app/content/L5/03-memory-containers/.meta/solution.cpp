// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <algorithm>

std::vector<long long> squares(std::size_t n) {
  std::vector<long long> out;
  out.reserve(n);            // 已知大小：一次配置好
  for (std::size_t i = 0; i < n; ++i) {
    out.push_back(static_cast<long long>(i) * static_cast<long long>(i));
  }
  return out;
}

std::vector<int> evens(const std::vector<int>& v) {
  std::vector<int> out;
  out.reserve(v.size());     // 最壞情況全部都是偶數
  for (int x : v) {
    if (x % 2 == 0) {
      out.push_back(x);
    }
  }
  return out;
}

void sort_in_place(std::vector<int>& v) {
  std::sort(v.begin(), v.end());   // 就地，不配置新容器
}
