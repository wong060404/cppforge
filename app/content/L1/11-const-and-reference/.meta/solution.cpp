// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

std::size_t length_of(const std::string& s) {
  return s.size();
}

void add_bang(std::string& s) {
  // 直接在 s 上操作，就不會有「忘了寫回」的問題
  s.push_back('!');
}

void swap_ints(int& a, int& b) {
  const int tmp = a;  // 先保住 a 的原值
  a = b;
  b = tmp;
}

long long total_of(const std::vector<int>& v) {
  long long sum = 0;
  for (int x : v) {
    sum += x;
  }
  return sum;
}
