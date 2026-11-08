#include "cf_test.hpp"
#include "tasks.hpp"

#include <optional>
#include <utility>
#include <vector>

CF_TEST("find_first_above：找到第一個符合的索引") {
  const std::vector<int> v{1, 5, 3};
  const auto r = find_first_above(v, 2);
  CF_EXPECT(r.has_value());
  CF_EXPECT_EQ(*r, static_cast<std::size_t>(1));
}

CF_TEST("find_first_above：索引 0 是合法結果，不可與「找不到」混淆") {
  const std::vector<int> v{5, 6};
  const auto r = find_first_above(v, 4);
  CF_EXPECT(r.has_value());
  CF_EXPECT_EQ(*r, static_cast<std::size_t>(0));
}

CF_TEST("find_first_above：都不符合時必須是 nullopt") {
  const std::vector<int> v{1, 2};
  CF_EXPECT_EQ(find_first_above(v, 9).has_value(), false);
}

CF_TEST("find_first_above：空 vector 是 nullopt") {
  const std::vector<int> v;
  CF_EXPECT_EQ(find_first_above(v, 0).has_value(), false);
}

CF_TEST("find_first_above：嚴格大於（等於不算）") {
  const std::vector<int> v{3, 3, 4};
  const auto r = find_first_above(v, 3);
  CF_EXPECT(r.has_value());
  CF_EXPECT_EQ(*r, static_cast<std::size_t>(2));
}

CF_TEST("min_max：一般情況") {
  const std::vector<int> v{3, 1, 4, 2};
  const auto r = min_max(v);
  CF_EXPECT(r.has_value());
  CF_EXPECT_EQ(r->first, 1);
  CF_EXPECT_EQ(r->second, 4);
}

CF_TEST("min_max：單一元素") {
  const std::vector<int> v{-5};
  const auto r = min_max(v);
  CF_EXPECT(r.has_value());
  CF_EXPECT_EQ(r->first, -5);
  CF_EXPECT_EQ(r->second, -5);
}

CF_TEST("min_max：全部是負數（不可用 0 當種子）") {
  const std::vector<int> v{-5, -3, -8};
  const auto r = min_max(v);
  CF_EXPECT(r.has_value());
  CF_EXPECT_EQ(r->first, -8);
  CF_EXPECT_EQ(r->second, -3);
}

CF_TEST("min_max：空 vector 必須是 nullopt") {
  const std::vector<int> v;
  CF_EXPECT_EQ(min_max(v).has_value(), false);
}

int main() { return cf::run_all(); }
