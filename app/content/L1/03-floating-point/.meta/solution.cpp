// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <algorithm>
#include <cmath>

bool nearly_equal(double a, double b) {
  const double diff = std::fabs(a - b);
  const double scale = std::max({1.0, std::fabs(a), std::fabs(b)});
  return diff <= 1e-9 * scale;
}

double mean3(double a, double b, double c) {
  return (a + b + c) / 3.0;
}

bool is_positive_inf(double x) {
  return std::isinf(x) && x > 0.0;
}
