#include "cf_test.hpp"
#include "tasks.hpp"

#include <vector>

CF_TEST("safe_at：合法索引取到正確值") {
  const std::vector<int> v{10, 20, 30};
  CF_EXPECT_EQ(safe_at(v, 0), 10);
  CF_EXPECT_EQ(safe_at(v, 2), 30);
}

CF_TEST("safe_at：越界回傳 0（不可讀出範圍外）") {
  const std::vector<int> v{10, 20, 30};
  CF_EXPECT_EQ(safe_at(v, 3), 0);
  CF_EXPECT_EQ(safe_at(v, 99), 0);
}

CF_TEST("safe_at：空 vector 一律回傳 0") {
  const std::vector<int> v;
  CF_EXPECT_EQ(safe_at(v, 0), 0);
}

CF_TEST("max_or_zero：一般情況") {
  const std::vector<int> v{3, 9, 2};
  CF_EXPECT_EQ(max_or_zero(v), 9);
}

CF_TEST("max_or_zero：全部是負數") {
  const std::vector<int> v{-5, -3, -8};
  CF_EXPECT_EQ(max_or_zero(v), -3);
}

CF_TEST("max_or_zero：空 vector 回傳 0") {
  const std::vector<int> v;
  CF_EXPECT_EQ(max_or_zero(v), 0);
}

CF_TEST("count_above：嚴格大於才計數") {
  const std::vector<int> v{1, 5, 3, 7, 2};
  CF_EXPECT_EQ(count_above(v, 2), 3);   // 5, 3, 7
  CF_EXPECT_EQ(count_above(v, 7), 0);   // 等於不算
}

CF_TEST("count_above：空 vector 回傳 0") {
  const std::vector<int> v;
  CF_EXPECT_EQ(count_above(v, 0), 0);
}

int main() { return cf::run_all(); }
