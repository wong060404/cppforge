// 起始碼：三個函式各有一個邊界條件沒處理。
// 先讀 lesson 的第三節，想清楚「空容器」與「越界」各自該回傳什麼。
#include "tasks.hpp"

int safe_at(const std::vector<int>& v, std::size_t i) {
  return v[i];  // 沒有檢查 i 是否越界
}

int max_or_zero(const std::vector<int>& v) {
  int best = 0;  // 種子取 0：全部是負數時會錯
  for (int x : v) {
    if (x > best) {
      best = x;
    }
  }
  return best;
}

std::size_t count_above(const std::vector<int>& v, int threshold) {
  std::size_t n = 0;
  for (int x : v) {
    if (x >= threshold) {  // 題目要求「嚴格大於」
      ++n;
    }
  }
  return n;
}
