#include "cf_test.hpp"
#include "tasks.hpp"

#include <vector>

CF_TEST("squares：長度與內容") {
  const auto v = squares(5);
  CF_EXPECT_EQ(v.size(), static_cast<std::size_t>(5));
  CF_EXPECT_EQ_RANGE(v, (std::vector<long long>{0, 1, 4, 9, 16}));
}

CF_TEST("squares：n 為 0 與 1") {
  CF_EXPECT_EQ(squares(0).size(), static_cast<std::size_t>(0));
  CF_EXPECT_EQ_RANGE(squares(1), (std::vector<long long>{0}));
}

CF_TEST("squares：大 n 也要正確（不會溢位成負數）") {
  const auto v = squares(1000);
  CF_EXPECT_EQ(v.size(), static_cast<std::size_t>(1000));
  CF_EXPECT_EQ(v[999], 999LL * 999LL);
}

CF_TEST("evens：只留偶數並保持順序") {
  const std::vector<int> v{1, 2, 3, 4, 6};
  CF_EXPECT_EQ_RANGE(evens(v), (std::vector<int>{2, 4, 6}));
}

CF_TEST("evens：沒有偶數與空的輸入") {
  const std::vector<int> odd{1, 3, 5};
  const std::vector<int> empty;
  CF_EXPECT_EQ(evens(odd).size(), static_cast<std::size_t>(0));
  CF_EXPECT_EQ(evens(empty).size(), static_cast<std::size_t>(0));
}

CF_TEST("evens：負數的偶數也要留") {
  const std::vector<int> v{-4, -3, 0, 7};
  CF_EXPECT_EQ_RANGE(evens(v), (std::vector<int>{-4, 0}));
}

CF_TEST("sort_in_place：由小到大") {
  std::vector<int> v{3, 1, 2};
  sort_in_place(v);
  CF_EXPECT_EQ_RANGE(v, (std::vector<int>{1, 2, 3}));
}

CF_TEST("sort_in_place：含重複與負數") {
  std::vector<int> v{5, -1, 5, 0};
  sort_in_place(v);
  CF_EXPECT_EQ_RANGE(v, (std::vector<int>{-1, 0, 5, 5}));
}

CF_TEST("sort_in_place：空與單一元素") {
  std::vector<int> empty;
  sort_in_place(empty);
  CF_EXPECT_EQ(empty.size(), static_cast<std::size_t>(0));
  std::vector<int> one{7};
  sort_in_place(one);
  CF_EXPECT_EQ(one.size(), static_cast<std::size_t>(1));
  CF_EXPECT_EQ(one[0], 7);
}

CF_TEST("sort_in_place：就地修改（呼叫者手上的 vector 被改到）") {
  std::vector<int> v{2, 1};
  sort_in_place(v);
  CF_EXPECT_EQ(v[0], 1);
  CF_EXPECT_EQ(v[1], 2);
}

int main() { return cf::run_all(); }
