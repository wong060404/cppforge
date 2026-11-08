// 起始碼：三個函式各有一個錯。
// 提示：一個迴圈多跑一格、一個反轉走訪了全部索引、一個回傳值而不是索引。
#include "tasks.hpp"

int sum_array(const std::array<int, 5>& a) {
  int total = 0;
  for (std::size_t i = 0; i <= a.size(); ++i) {  // 多跑了 i == size()
    total += a[i];
  }
  return total;
}

void reverse_array(std::array<int, 5>& a) {
  for (std::size_t i = 0; i < a.size(); ++i) {  // 走訪全部 → 每對換兩次
    const int tmp = a[i];
    a[i] = a[a.size() - 1 - i];
    a[a.size() - 1 - i] = tmp;
  }
}

std::size_t index_of_max(const std::array<int, 5>& a) {
  int best = a[0];
  for (std::size_t i = 1; i < a.size(); ++i) {
    if (a[i] > best) {
      best = a[i];  // 只記了值，沒記索引
    }
  }
  return static_cast<std::size_t>(best);
}
