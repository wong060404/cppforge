#include "cf_test.hpp"
#include "tasks.hpp"

#include <cmath>

CF_TEST("整數平均：7 與 2 → 4") {
  CF_EXPECT_EQ(int_average(7, 2), 4);
}

CF_TEST("整數平均：1 與 1 → 1（拆開除會丟掉進位）") {
  CF_EXPECT_EQ(int_average(1, 1), 1);
}

CF_TEST("整數平均：向零截斷（-7 與 2 → -2）") {
  CF_EXPECT_EQ(int_average(-7, 2), -2);
}

CF_TEST("整數平均：3 與 4 → 3") {
  CF_EXPECT_EQ(int_average(3, 4), 3);
}

CF_TEST("浮點平均：7 與 2 → 4.5") {
  CF_EXPECT(std::fabs(real_average(7, 2) - 4.5) < 1e-9);
}

CF_TEST("浮點平均：1 與 1 → 1.0") {
  CF_EXPECT(std::fabs(real_average(1, 1) - 1.0) < 1e-9);
}

CF_TEST("百分比：1/3 → 33") {
  CF_EXPECT_EQ(percent(1, 3), 33);
}

CF_TEST("百分比：2/3 → 67（四捨五入）") {
  CF_EXPECT_EQ(percent(2, 3), 67);
}

CF_TEST("百分比：100/400 → 25") {
  CF_EXPECT_EQ(percent(100, 400), 25);
}

CF_TEST("百分比：分母為 0 → 0（不可除以零）") {
  CF_EXPECT_EQ(percent(1, 0), 0);
}

int main() { return cf::run_all(); }
