// 起始碼：三個地方「對浮點數的直覺是錯的」，而且都能編譯。
// 提示：浮點不能直接 ==、中途被截成整數、用「很大的數」判斷無限大。
#include "tasks.hpp"

bool nearly_equal(double a, double b) {
  return a == b;      // 浮點數幾乎不會剛好相等
}

double mean3(double a, double b, double c) {
  int sum = 0;
  sum += static_cast<int>(a);   // 這裡就把小數丟掉了
  sum += static_cast<int>(b);
  sum += static_cast<int>(c);
  return sum / 3.0;
}

bool is_positive_inf(double x) {
  return x > 1e300;   // 1e301 是有限數，也會通過這個判斷
}
