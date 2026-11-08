#include "cf_test.hpp"
#include "submission.hpp"
#include "tasks.hpp"

#include <string>
#include <vector>

CF_TEST("sum_all：int") {
  const std::vector<int> v{1, 2, 3};
  CF_EXPECT_EQ(sum_all(v), 6);
}

CF_TEST("sum_all：空 vector 回傳 0") {
  const std::vector<int> v;
  CF_EXPECT_EQ(sum_all(v), 0);
}

CF_TEST("sum_all：同一份程式碼也支援 std::string") {
  const std::vector<std::string> v{"ab", "cd", "e"};
  CF_EXPECT_EQ(sum_all(v), std::string("abcde"));
}

CF_TEST("sum_all：double") {
  const std::vector<double> v{1.5, 2.5};
  CF_EXPECT_NEAR(sum_all(v), 4.0, 1e-9);
}

CF_TEST("sum_all：單一元素要算進去") {
  const std::vector<int> v{7};
  CF_EXPECT_EQ(sum_all(v), 7);
}

CF_TEST("greater_than：嚴格大於（等於的不算）") {
  const std::vector<int> v{1, 2, 3};
  CF_EXPECT_EQ_RANGE(greater_than(v, 2), (std::vector<int>{3}));
}

CF_TEST("greater_than：空 vector 回傳空") {
  const std::vector<int> v;
  CF_EXPECT_EQ(greater_than(v, 1).size(), static_cast<std::size_t>(0));
}

CF_TEST("greater_than：保持原順序，也支援 string") {
  const std::vector<std::string> v{"apple", "zebra", "mango"};
  CF_EXPECT_EQ_RANGE(greater_than(v, std::string("b")),
                     (std::vector<std::string>{"zebra", "mango"}));
}

CF_TEST("min_max：回傳 {最小, 最大}") {
  const std::vector<int> v{3, 1, 2};
  const auto mm = min_max(v);
  CF_EXPECT_EQ(mm.first, 1);
  CF_EXPECT_EQ(mm.second, 3);
}

CF_TEST("min_max：空 vector 回傳 {0, 0}") {
  const std::vector<int> v;
  const auto mm = min_max(v);
  CF_EXPECT_EQ(mm.first, 0);
  CF_EXPECT_EQ(mm.second, 0);
}

CF_TEST("min_max：也支援 string") {
  const std::vector<std::string> v{"banana", "apple", "cherry"};
  const auto mm = min_max(v);
  CF_EXPECT_EQ(mm.first, std::string("apple"));
  CF_EXPECT_EQ(mm.second, std::string("cherry"));
}

int main() { return cf::run_all(); }
