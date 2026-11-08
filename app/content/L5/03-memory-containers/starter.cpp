// 起始碼：三個地方不合格。
// 提示：一個沒有 reserve、一個條件寫成奇數、一個排成由大到小。
#include "tasks.hpp"

#include <algorithm>

std::vector<long long> squares(std::size_t n) {
  std::vector<long long> out;
  for (std::size_t i = 0; i < n; ++i) {
    out.push_back(static_cast<long long>(i) * static_cast<long long>(i));
  }
  return out;
}

std::vector<int> evens(const std::vector<int>& v) {
  std::vector<int> out;
  for (int x : v) {
    if (x % 2 != 0) {   // 條件寫反了：留下的是奇數
      out.push_back(x);
    }
  }
  return out;
}

void sort_in_place(std::vector<int>& v) {
  std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });  // 由大到小
}
