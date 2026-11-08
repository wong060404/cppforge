#include "cf_test.hpp"
#include "tasks.hpp"

#include <cstddef>

CF_TEST("next：回傳下一個元素的位址") {
  int a[5] = {10, 20, 30, 40, 50};
  CF_EXPECT(next(&a[0]) == &a[1]);
  CF_EXPECT(next(&a[3]) == &a[4]);
}

CF_TEST("next：走過整個陣列") {
  int a[3] = {1, 2, 3};
  const int* p = &a[0];
  p = next(p);
  CF_EXPECT_EQ(*p, 2);
  p = next(p);
  CF_EXPECT_EQ(*p, 3);
}

CF_TEST("find_value：找到時回傳該位置") {
  int a[5] = {10, 20, 30, 40, 50};
  CF_EXPECT(find_value(a, a + 5, 30) == &a[2]);
  CF_EXPECT(find_value(a, a + 5, 10) == &a[0]);
}

CF_TEST("find_value：找不到時回 nullptr") {
  int a[3] = {1, 2, 3};
  CF_EXPECT(find_value(a, a + 3, 99) == nullptr);
}

CF_TEST("find_value：空範圍") {
  int a[1] = {7};
  CF_EXPECT(find_value(a, a, 7) == nullptr);
}

CF_TEST("flat_index：非方陣才抓得出 row/col 寫反") {
  // 2 列 × 3 欄： (1,2) 應該是 1*3+2 = 5
  CF_EXPECT_EQ(flat_index(1, 2, 3), static_cast<std::size_t>(5));
  CF_EXPECT_EQ(flat_index(0, 0, 3), static_cast<std::size_t>(0));
  CF_EXPECT_EQ(flat_index(1, 0, 3), static_cast<std::size_t>(3));
}

CF_TEST("flat_index：3×2 也要正確") {
  CF_EXPECT_EQ(flat_index(2, 1, 2), static_cast<std::size_t>(5));
  CF_EXPECT_EQ(flat_index(0, 1, 2), static_cast<std::size_t>(1));
}

CF_TEST("flat_index：與真實陣列的位址一致") {
  int m[2][3] = {{1, 2, 3}, {4, 5, 6}};
  const int* base = &m[0][0];
  for (std::size_t r = 0; r < 2; ++r) {
    for (std::size_t c = 0; c < 3; ++c) {
      CF_EXPECT_EQ(base[flat_index(r, c, 3)], m[r][c]);
    }
  }
}

int main() { return cf::run_all(); }
