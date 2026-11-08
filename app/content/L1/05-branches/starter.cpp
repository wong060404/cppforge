// 起始碼：三個地方「邊界或前提沒處理」，都能編譯。
// 提示：`>` 與 `>=` 的差別、lo > hi 的交換、閏年的世紀規則。
#include "tasks.hpp"

std::string grade(int score) {
  if (score > 90) {      // 剛好 90 會掉到下一行
    return "A";
  }
  if (score > 80) {
    return "B";
  }
  if (score > 70) {
    return "C";
  }
  if (score > 60) {
    return "D";
  }
  return "F";
}

int clamp(int x, int lo, int hi) {
  // 沒有處理 lo > hi 的情況
  if (x < lo) {
    return lo;
  }
  if (x > hi) {
    return hi;
  }
  return x;
}

bool is_leap(int year) {
  return year % 4 == 0;   // 少了「100 的倍數不算、400 的倍數算」
}
