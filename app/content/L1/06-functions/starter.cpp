// 起始碼：三個地方「改不到呼叫者 / 沒用到參數」，都能編譯。
// 提示：參考參數的寫入、times 參數、range-for 的 &。
#include "tasks.hpp"

void divmod(int a, int b, int& quotient, int& remainder) {
  // 商與餘數寫反了
  quotient = a % b;
  remainder = a / b;
}

std::string repeat(const std::string& s, int times) {
  (void)times;      // 完全沒用到
  return s;
}

void scale_in_place(std::vector<int>& v, int factor) {
  for (int x : v) {
    const int scaled = x * factor;   // 算出來了，但沒有寫回 vector
    (void)scaled;
  }
}
