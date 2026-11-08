// 起始碼：三個地方「型別用錯」，而且都能編譯。
// 提示：一個是整數除法、一個回傳餘數而不是比較結果、一個把 0 歸錯邊。
#include "tasks.hpp"

double average3(int a, int b, int c) {
  return (a + b + c) / 3;   // 整數除法：小數被截掉
}

bool is_even(int x) {
  return x % 2;             // 回傳餘數（0 或 1），不是「是否整除」
}

std::string describe_sign(int x) {
  if (x >= 0) {             // 0 被歸到這裡
    return "positive";
  }
  return "negative";
}
