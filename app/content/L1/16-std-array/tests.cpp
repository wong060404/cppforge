#include "cf_test.hpp"
#include "tasks.hpp"

#include <array>

namespace {
std::array<int, 5> five(int a, int b, int c, int d, int e) { return {a, b, c, d, e}; }
}

CF_TEST("sum：一般情況") {
  CF_EXPECT_EQ(sum_array(five(1, 2, 3, 4, 5)), 15);
}

CF_TEST("sum：全為 0") {
  CF_EXPECT_EQ(sum_array(five(0, 0, 0, 0, 0)), 0);
}

CF_TEST("sum：含負數") {
  CF_EXPECT_EQ(sum_array(five(-1, -2, -3, -4, -5)), -15);
}

CF_TEST("reverse：基本反轉") {
  auto a = five(1, 2, 3, 4, 5);
  reverse_array(a);
  CF_EXPECT_EQ(a[0], 5);
  CF_EXPECT_EQ(a[1], 4);
  CF_EXPECT_EQ(a[2], 3);
  CF_EXPECT_EQ(a[3], 2);
  CF_EXPECT_EQ(a[4], 1);
}

CF_TEST("reverse：反轉兩次回到原樣") {
  auto a = five(7, 8, 9, 10, 11);
  reverse_array(a);
  reverse_array(a);
  CF_EXPECT_EQ(a[0], 7);
  CF_EXPECT_EQ(a[4], 11);
}

CF_TEST("reverse：全部相同時不變") {
  auto a = five(4, 4, 4, 4, 4);
  reverse_array(a);
  CF_EXPECT_EQ(a[0], 4);
  CF_EXPECT_EQ(a[4], 4);
}

CF_TEST("index_of_max：一般情況回傳索引") {
  CF_EXPECT_EQ(index_of_max(five(3, 9, 2, 1, 0)), static_cast<std::size_t>(1));
}

CF_TEST("index_of_max：多個最大值取最前面") {
  CF_EXPECT_EQ(index_of_max(five(3, 9, 9, 1, 0)), static_cast<std::size_t>(1));
}

CF_TEST("index_of_max：全部相同回傳 0") {
  CF_EXPECT_EQ(index_of_max(five(7, 7, 7, 7, 7)), static_cast<std::size_t>(0));
}

CF_TEST("index_of_max：最大值在最後") {
  CF_EXPECT_EQ(index_of_max(five(1, 2, 3, 4, 99)), static_cast<std::size_t>(4));
}

int main() { return cf::run_all(); }
