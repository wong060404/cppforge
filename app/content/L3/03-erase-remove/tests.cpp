#include "cf_test.hpp"
#include "tasks.hpp"

#include <vector>

CF_TEST("unique_sorted：去重且排序") {
  const std::vector<int> v{3, 1, 3, 2, 1};
  CF_EXPECT_EQ_RANGE(unique_sorted(v), (std::vector<int>{1, 2, 3}));
}

CF_TEST("unique_sorted：空 vector 回傳空") {
  const std::vector<int> v;
  CF_EXPECT_EQ(unique_sorted(v).size(), static_cast<std::size_t>(0));
}

CF_TEST("unique_sorted：全部相同只留一個") {
  const std::vector<int> v{5, 5, 5};
  CF_EXPECT_EQ_RANGE(unique_sorted(v), (std::vector<int>{5}));
}

CF_TEST("unique_sorted：不改動傳入的 vector") {
  const std::vector<int> v{3, 1, 2};
  (void)unique_sorted(v);
  CF_EXPECT_EQ_RANGE(v, (std::vector<int>{3, 1, 2}));
}

CF_TEST("remove_all：移除所有指定值並回傳新大小") {
  std::vector<int> v{1, 2, 1, 3, 1};
  const std::size_t n = remove_all(v, 1);
  CF_EXPECT_EQ(n, static_cast<std::size_t>(2));
  CF_EXPECT_EQ(v.size(), static_cast<std::size_t>(2));
  CF_EXPECT_EQ_RANGE(v, (std::vector<int>{2, 3}));
}

CF_TEST("remove_all：全部符合時清空") {
  std::vector<int> v{1, 1, 1};
  CF_EXPECT_EQ(remove_all(v, 1), static_cast<std::size_t>(0));
  CF_EXPECT_EQ(v.size(), static_cast<std::size_t>(0));
}

CF_TEST("remove_all：沒有符合的元素時不變") {
  std::vector<int> v{2, 3};
  CF_EXPECT_EQ(remove_all(v, 9), static_cast<std::size_t>(2));
  CF_EXPECT_EQ_RANGE(v, (std::vector<int>{2, 3}));
}

CF_TEST("intersect_sorted：取真正的交集") {
  const std::vector<int> a{1, 2, 3};
  const std::vector<int> b{2, 3, 4};
  CF_EXPECT_EQ_RANGE(intersect_sorted(a, b), (std::vector<int>{2, 3}));
}

CF_TEST("intersect_sorted：沒有共同元素回傳空") {
  const std::vector<int> a{1, 2};
  const std::vector<int> b{3, 4};
  CF_EXPECT_EQ(intersect_sorted(a, b).size(), static_cast<std::size_t>(0));
}

CF_TEST("intersect_sorted：兩邊都有重複時仍然去重") {
  const std::vector<int> a{2, 2, 5};
  const std::vector<int> b{2, 2, 7};
  CF_EXPECT_EQ_RANGE(intersect_sorted(a, b), (std::vector<int>{2}));
}

int main() { return cf::run_all(); }
