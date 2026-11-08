// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <utility>

std::string grade(int score) {
  // 由嚴到寬，且都用 >=（邊界屬於較高等級）
  if (score >= 90) {
    return "A";
  }
  if (score >= 80) {
    return "B";
  }
  if (score >= 70) {
    return "C";
  }
  if (score >= 60) {
    return "D";
  }
  return "F";
}

int clamp(int x, int lo, int hi) {
  if (lo > hi) {
    std::swap(lo, hi);     // 先修正前提
  }
  if (x < lo) {
    return lo;
  }
  if (x > hi) {
    return hi;
  }
  return x;
}

bool is_leap(int year) {
  if (year % 4 != 0) {
    return false;
  }
  if (year % 100 != 0) {
    return true;
  }
  return year % 400 == 0;
}
