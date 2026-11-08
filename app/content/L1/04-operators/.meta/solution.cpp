// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

long long int_pow(int a, unsigned b) {
  long long result = 1;          // 乘法單位元素
  for (unsigned i = 0; i < b; ++i) {
    result *= a;
  }
  return result;
}

int max3(int a, int b, int c) {
  int best = a;
  if (b > best) {
    best = b;
  }
  if (c > best) {
    best = c;
  }
  return best;
}

bool in_range(int x, int lo, int hi) {
  return lo <= x && x <= hi;
}
