#include "cf_test.hpp"
#include "tasks.hpp"

#include <climits>
#include <limits>

CF_TEST("int_bits：回傳位元數，不是位元組數") {
  CF_EXPECT_EQ(int_bits(), static_cast<int>(sizeof(int) * 8));
}

CF_TEST("int_bits：至少是 16（標準下限）") {
  CF_EXPECT(int_bits() >= 16);
}

CF_TEST("int_bits：與 CHAR_BIT 交叉驗證") {
  CF_EXPECT_EQ(int_bits(), static_cast<int>(sizeof(int) * CHAR_BIT));
}

CF_TEST("fits_in_short：上界") {
  CF_EXPECT_EQ(fits_in_short(std::numeric_limits<short>::max()), true);
  CF_EXPECT_EQ(fits_in_short(static_cast<long long>(std::numeric_limits<short>::max()) + 1), false);
}

CF_TEST("fits_in_short：下界（-32768 是合法的）") {
  CF_EXPECT_EQ(fits_in_short(std::numeric_limits<short>::min()), true);
  CF_EXPECT_EQ(fits_in_short(static_cast<long long>(std::numeric_limits<short>::min()) - 1), false);
}

CF_TEST("fits_in_short：遠超出範圍") {
  CF_EXPECT_EQ(fits_in_short(1'000'000), false);
  CF_EXPECT_EQ(fits_in_short(-1'000'000), false);
  CF_EXPECT_EQ(fits_in_short(0), true);
}

CF_TEST("low_byte：取最低 8 位") {
  CF_EXPECT_EQ(static_cast<int>(low_byte(0x1234u)), 0x34);
  CF_EXPECT_EQ(static_cast<int>(low_byte(0xFFu)), 0xFF);
  CF_EXPECT_EQ(static_cast<int>(low_byte(0x100u)), 0x00);
}

CF_TEST("low_byte：邊界 0 與 255") {
  CF_EXPECT_EQ(static_cast<int>(low_byte(0u)), 0);
  CF_EXPECT_EQ(static_cast<int>(low_byte(255u)), 255);
  CF_EXPECT_EQ(static_cast<int>(low_byte(256u)), 0);
}

int main() { return cf::run_all(); }
