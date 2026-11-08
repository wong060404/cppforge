// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

double average3(int a, int b, int c) {
  // 先轉成 double 再相加，避免整數除法
  return (static_cast<double>(a) + b + c) / 3.0;
}

bool is_even(int x) {
  return x % 2 == 0;
}

std::string describe_sign(int x) {
  if (x > 0) {
    return "positive";
  }
  if (x < 0) {
    return "negative";
  }
  return "zero";
}
