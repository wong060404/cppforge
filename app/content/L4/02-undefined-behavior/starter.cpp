// 起始碼：三個地方各有問題，而且都「在小數字上看起來正常」。
// 提示：一個先相加才除（會溢位）、一個用 at()（越界會丟例外）、一個沒有夾住範圍。
#include "tasks.hpp"

int midpoint(int a, int b) {
  return (a + b) / 2;  // 接近 INT_MAX 時相加就溢位（UB）
}

std::optional<int> safe_at(const std::vector<int>& v, std::size_t i) {
  return v.at(i);  // 越界時丟 std::out_of_range，但介面要求回 nullopt
}

unsigned char clamp_byte(int x) {
  return static_cast<unsigned char>(x);  // 沒有夾到 [0, 255]
}

int first_of(std::size_t n) {
  if (n == 0) {
    return 0;
  }
  int* p = new int[n];  // 沒有 delete[]：測試會過，但工具抓得到
  p[0] = 42;
  return p[0];
}
