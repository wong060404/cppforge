#include "cf_test.hpp"
#include "tasks.hpp"

#include <climits>
#include <vector>

CF_TEST("midpoint：一般正數") {
  CF_EXPECT_EQ(midpoint(2, 8), 5);
  CF_EXPECT_EQ(midpoint(1, 2), 1);   // 向零截斷
}

CF_TEST("midpoint：兩個都在 INT_MAX 附近（不得溢位）") {
  CF_EXPECT_EQ(midpoint(INT_MAX - 2, INT_MAX), INT_MAX - 1);
  CF_EXPECT_EQ(midpoint(INT_MAX, INT_MAX), INT_MAX);
}

CF_TEST("midpoint：跨到負數極值") {
  CF_EXPECT_EQ(midpoint(INT_MIN, INT_MAX), 0);
  CF_EXPECT_EQ(midpoint(INT_MIN, INT_MIN), INT_MIN);
}

CF_TEST("midpoint：負數") {
  CF_EXPECT_EQ(midpoint(-8, -2), -5);
}

CF_TEST("safe_at：範圍內回傳值") {
  const std::vector<int> v{10, 20, 30};
  const auto r = safe_at(v, 1);
  CF_EXPECT_EQ(r.has_value(), true);
  CF_EXPECT_EQ(r.value_or(-1), 20);
}

CF_TEST("safe_at：越界回 nullopt，不拋例外") {
  const std::vector<int> v{10, 20, 30};
  CF_EXPECT_EQ(safe_at(v, 3).has_value(), false);
  CF_EXPECT_EQ(safe_at(v, 99).has_value(), false);
}

CF_TEST("safe_at：空 vector") {
  const std::vector<int> v;
  CF_EXPECT_EQ(safe_at(v, 0).has_value(), false);
}

CF_TEST("clamp_byte：範圍內原樣回傳") {
  CF_EXPECT_EQ(static_cast<int>(clamp_byte(0)), 0);
  CF_EXPECT_EQ(static_cast<int>(clamp_byte(100)), 100);
  CF_EXPECT_EQ(static_cast<int>(clamp_byte(255)), 255);
}

CF_TEST("clamp_byte：負數夾到 0") {
  CF_EXPECT_EQ(static_cast<int>(clamp_byte(-1)), 0);
  CF_EXPECT_EQ(static_cast<int>(clamp_byte(-1000)), 0);
}

CF_TEST("clamp_byte：超過 255 夾到 255") {
  CF_EXPECT_EQ(static_cast<int>(clamp_byte(256)), 255);
  CF_EXPECT_EQ(static_cast<int>(clamp_byte(INT_MAX)), 255);
}

CF_TEST("first_of：回傳第一個元素") {
  CF_EXPECT_EQ(first_of(3), 42);
  CF_EXPECT_EQ(first_of(1), 42);
}

CF_TEST("first_of：n 為 0 回傳 0") {
  CF_EXPECT_EQ(first_of(0), 0);
}

int main() { return cf::run_all(); }
