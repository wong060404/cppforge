// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

void divmod(int a, int b, int& quotient, int& remainder) {
  quotient = a / b;     // 直接寫進呼叫者的變數
  remainder = a % b;
}

std::string repeat(const std::string& s, int times) {
  std::string out;
  if (times <= 0) {
    return out;
  }
  out.reserve(s.size() * static_cast<std::size_t>(times));
  for (int i = 0; i < times; ++i) {
    out += s;
  }
  return out;
}

void scale_in_place(std::vector<int>& v, int factor) {
  for (int& x : v) {    // 用參考才能改到本體
    x *= factor;
  }
}
