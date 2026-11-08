#include "cf_test.hpp"
#include "tasks.hpp"

#include <vector>

CF_TEST("n = 0 時總和為 0") {
  const std::vector<int> v{1, 2, 3};
  CF_EXPECT_EQ(sum_first_n(v, 0), 0);
}

CF_TEST("加總全部元素") {
  const std::vector<int> v{1, 2, 3, 4};
  CF_EXPECT_EQ(sum_first_n(v, 4), 10);
}

CF_TEST("只加總前 n 個") {
  const std::vector<int> v{10, 20, 30, 40};
  CF_EXPECT_EQ(sum_first_n(v, 2), 30);
}

CF_TEST("n 超過 size 時不得越界") {
  const std::vector<int> v{5, 5, 5};
  CF_EXPECT_EQ(sum_first_n(v, 100), 15);
}

CF_TEST("空 vector 且 n > 0") {
  const std::vector<int> v;
  CF_EXPECT_EQ(sum_first_n(v, 3), 0);
}

CF_TEST("負數也要正確加總") {
  const std::vector<int> v{-5, 5, -10};
  CF_EXPECT_EQ(sum_first_n(v, 3), -10);
}

int main() { return cf::run_all(); }
