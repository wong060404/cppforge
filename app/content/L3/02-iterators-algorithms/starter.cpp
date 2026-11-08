// 起始碼：三個地方漏了。
// 提示：一個謂詞寫反、一個忘了排序、一個用錯演算法。
#include "tasks.hpp"

#include <algorithm>

std::size_t count_even(const std::vector<int>& v) {
  // 謂詞寫反了：這樣數的是奇數
  const auto n = std::count_if(v.begin(), v.end(), [](int x) { return x % 2 != 0; });
  return static_cast<std::size_t>(n);
}

std::vector<int> sorted_copy(const std::vector<int>& v) {
  std::vector<int> out = v;
  // 少了排序
  return out;
}

bool any_negative(const std::vector<int>& v) {
  // all_of 的語意是「全部」，不是「存在」
  return std::all_of(v.begin(), v.end(), [](int x) { return x < 0; });
}

int max_or_zero(const std::vector<int>& v) {
  const auto it = std::max_element(v.begin(), v.end());
  if (it == v.end()) {
    return 0;   // 空容器：max_element 回傳 end()
  }
  return *it;
}
