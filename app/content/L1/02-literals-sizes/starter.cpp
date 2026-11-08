// 起始碼：三個地方「差一點點」，而且都能編譯。
// 提示：位元組 vs 位元、short 的極值、遮罩 vs 位移。
#include "tasks.hpp"

int int_bits() {
  return static_cast<int>(sizeof(int));   // 位元組，不是位元
}

bool fits_in_short(long long v) {
  // 手寫極值：short 的下界其實是 -32768
  return v >= -32767 && v <= 32767;
}

unsigned char low_byte(unsigned v) {
  return static_cast<unsigned char>(v >> 8);   // 往高位走
}
