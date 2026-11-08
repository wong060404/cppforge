#include "cf_test.hpp"
#include "tasks.hpp"

CF_TEST("int_pow：基本次方") {
  CF_EXPECT_EQ(int_pow(2, 10), 1024LL);
  CF_EXPECT_EQ(int_pow(3, 3), 27LL);
}

CF_TEST("int_pow：指數 0 必須回 1") {
  CF_EXPECT_EQ(int_pow(5, 0), 1LL);
  CF_EXPECT_EQ(int_pow(0, 0), 1LL);
}

CF_TEST("int_pow：負底數與奇偶次方") {
  CF_EXPECT_EQ(int_pow(-2, 3), -8LL);
  CF_EXPECT_EQ(int_pow(-2, 2), 4LL);
}

CF_TEST("int_pow：大一點的次方不會溢位（用 long long）") {
  CF_EXPECT_EQ(int_pow(2, 40), 1099511627776LL);
}

CF_TEST("max3：最大值可能在任一位置") {
  CF_EXPECT_EQ(max3(3, 1, 2), 3);
  CF_EXPECT_EQ(max3(1, 3, 2), 3);
  CF_EXPECT_EQ(max3(1, 2, 3), 3);   // 最大值在第三個參數
}

CF_TEST("max3：a 比 b 大但 c 最大") {
  CF_EXPECT_EQ(max3(2, 1, 5), 5);
  CF_EXPECT_EQ(max3(9, 1, 10), 10);
}

CF_TEST("max3：含負數與相等值") {
  CF_EXPECT_EQ(max3(-5, -1, -9), -1);
  CF_EXPECT_EQ(max3(7, 7, 7), 7);
}

CF_TEST("in_range：邊界要包含") {
  CF_EXPECT_EQ(in_range(5, 5, 10), true);
  CF_EXPECT_EQ(in_range(10, 5, 10), true);
}

CF_TEST("in_range：範圍內與範圍外") {
  CF_EXPECT_EQ(in_range(7, 5, 10), true);
  CF_EXPECT_EQ(in_range(4, 5, 10), false);
  CF_EXPECT_EQ(in_range(11, 5, 10), false);
}

CF_TEST("in_range：超出範圍的大數也要是 false") {
  CF_EXPECT_EQ(in_range(999, 0, 10), false);
}

int main() { return cf::run_all(); }
