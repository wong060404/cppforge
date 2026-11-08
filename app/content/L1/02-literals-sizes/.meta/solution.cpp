// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <limits>

int int_bits() {
  return static_cast<int>(sizeof(int) * 8);
}

bool fits_in_short(long long v) {
  return v >= std::numeric_limits<short>::min() && v <= std::numeric_limits<short>::max();
}

unsigned char low_byte(unsigned v) {
  return static_cast<unsigned char>(v & 0xFFu);
}
