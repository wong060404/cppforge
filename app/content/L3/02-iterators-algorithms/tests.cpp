#include "cf_test.hpp"
#include "tasks.hpp"

#include <vector>

CF_TEST("count_even：數的是偶數") {
  const std::vector<int> v{1, 2, 3, 4, 6};
  CF_EXPECT_EQ(count_even(v), static_cast<std::size_t>(3));
}

CF_TEST("count_even：沒有偶數時為 0") {
  const std::vector<int> v{1, 3, 5};
  CF_EXPECT_EQ(count_even(v), static_cast<std::size_t>(0));
}

CF_TEST("count_even：空 vector 為 0") {
  const std::vector<int> v;
  CF_EXPECT_EQ(count_even(v), static_cast<std::size_t>(0));
}

CF_TEST("sorted_copy：回傳遞增排序的結果") {
  const std::vector<int> v{3, 1, 2};
  CF_EXPECT_EQ_RANGE(sorted_copy(v), (std::vector<int>{1, 2, 3}));
}

CF_TEST("sorted_copy：不得改動傳入的 vector") {
  const std::vector<int> v{3, 1, 2};
  (void)sorted_copy(v);
  CF_EXPECT_EQ_RANGE(v, (std::vector<int>{3, 1, 2}));
}

CF_TEST("sorted_copy：含重複與負數") {
  const std::vector<int> v{2, -1, 2, 0};
  CF_EXPECT_EQ_RANGE(sorted_copy(v), (std::vector<int>{-1, 0, 2, 2}));
}

CF_TEST("any_negative：有負數時為 true") {
  const std::vector<int> v{1, -2, 3};
  CF_EXPECT_EQ(any_negative(v), true);
}

CF_TEST("any_negative：全正與空 vector 都為 false") {
  const std::vector<int> all_positive{1, 2, 3};
  const std::vector<int> empty;
  CF_EXPECT_EQ(any_negative(all_positive), false);
  CF_EXPECT_EQ(any_negative(empty), false);
}

CF_TEST("max_or_zero：一般情況") {
  const std::vector<int> v{3, 9, 2};
  CF_EXPECT_EQ(max_or_zero(v), 9);
}

CF_TEST("max_or_zero：全部為負數與空 vector") {
  const std::vector<int> negatives{-5, -1};
  const std::vector<int> empty;
  CF_EXPECT_EQ(max_or_zero(negatives), -1);
  CF_EXPECT_EQ(max_or_zero(empty), 0);
}

int main() { return cf::run_all(); }
