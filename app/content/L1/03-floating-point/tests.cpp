#include "cf_test.hpp"
#include "tasks.hpp"

#include <cmath>
#include <limits>

CF_TEST("nearly_equal：0.1 + 0.2 與 0.3 幾乎相等") {
  CF_EXPECT_EQ(nearly_equal(0.1 + 0.2, 0.3), true);
}

CF_TEST("nearly_equal：很接近但不相等的數") {
  CF_EXPECT_EQ(nearly_equal(1.0, 1.0 + 1e-12), true);
  CF_EXPECT_EQ(nearly_equal(1.0, 1.0 + 1e-3), false);
}

CF_TEST("nearly_equal：差很遠與負數") {
  CF_EXPECT_EQ(nearly_equal(2.0, 3.0), false);
  CF_EXPECT_EQ(nearly_equal(-1.5, -1.5), true);
}

CF_TEST("nearly_equal：大數的相對誤差") {
  CF_EXPECT_EQ(nearly_equal(1e12, 1e12 + 1.0), true);      // 相對差 1e-12
}

CF_TEST("mean3：保留小數") {
  CF_EXPECT_NEAR(mean3(1.0, 2.0, 2.0), 5.0 / 3.0, 1e-12);
  CF_EXPECT_NEAR(mean3(0.1, 0.2, 0.3), 0.2, 1e-12);
}

CF_TEST("mean3：含小數的輸入不能被截斷") {
  CF_EXPECT_NEAR(mean3(1.5, 2.5, 3.5), 2.5, 1e-12);
  CF_EXPECT_NEAR(mean3(-1.5, 0.0, 1.5), 0.0, 1e-12);
}

CF_TEST("is_positive_inf：對 +inf 為 true") {
  CF_EXPECT_EQ(is_positive_inf(std::numeric_limits<double>::infinity()), true);
}

CF_TEST("is_positive_inf：有限的大數與 -inf 都是 false") {
  CF_EXPECT_EQ(is_positive_inf(1e308), false);
  CF_EXPECT_EQ(is_positive_inf(1e301), false);
  CF_EXPECT_EQ(is_positive_inf(-std::numeric_limits<double>::infinity()), false);
  CF_EXPECT_EQ(is_positive_inf(0.0), false);
}

int main() { return cf::run_all(); }
