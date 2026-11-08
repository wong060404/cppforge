// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <cmath>

int int_average(int a, int b) {
  // 先加再除：兩個小數合起來可能剛好進位成整數
  return (a + b) / 2;
}

double real_average(int a, int b) {
  // 2.0 讓整個算式升級成浮點運算
  return (a + b) / 2.0;
}

int percent(int part, int whole) {
  if (whole == 0) {
    return 0;
  }
  const double ratio = static_cast<double>(part) * 100.0 / static_cast<double>(whole);
  return static_cast<int>(std::lround(ratio));
}
