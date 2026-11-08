// 起始碼：三個地方「算錯了」，但都能編譯。
// 提示：累乘的起始值、max3 的三段式分支、in_range 的邊界。
#include "tasks.hpp"

long long int_pow(int a, unsigned b) {
  long long result = 0;   // 乘法單位元素是 1
  for (unsigned i = 0; i < b; ++i) {
    result *= a;
  }
  return result;
}

int max3(int a, int b, int c) {
  // 三段式很漂亮，但 a > b 時它只比較了 c 與 a，另一個值被丟掉了
  return (a > b) ? (a > c ? a : b) : (b > c ? b : c);
}

bool in_range(int x, int lo, int hi) {
  // 兩邊都用嚴格比較 → 邊界值會被排除
  return lo < x && x < hi;
}
