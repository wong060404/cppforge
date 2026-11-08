#include "cf_test.hpp"
#include "tasks.hpp"

#include <stdexcept>
#include <type_traits>
#include <utility>

CF_TEST("size：建構後大小正確") {
  const Buffer b(4);
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(4));
}

CF_TEST("初始值全部為 0（make_unique<int[]>(n) 會值初始化）") {
  const Buffer b(3);
  CF_EXPECT_EQ(b.at(0), 0);
  CF_EXPECT_EQ(b.at(2), 0);
}

CF_TEST("set 與 at 往返") {
  Buffer b(3);
  b.set(1, 42);
  CF_EXPECT_EQ(b.at(1), 42);
}

CF_TEST("at：越界丟 out_of_range") {
  const Buffer b(3);
  CF_EXPECT_THROW(b.at(3), std::out_of_range);
}

CF_TEST("set：越界丟 out_of_range") {
  Buffer b(3);
  CF_EXPECT_THROW(b.set(3, 1), std::out_of_range);
}

CF_TEST("empty：有元素時為 false") {
  const Buffer b(2);
  CF_EXPECT_EQ(b.empty(), false);
}

CF_TEST("empty：大小為 0 時為 true") {
  const Buffer b(0);
  CF_EXPECT_EQ(b.empty(), true);
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(0));
}

CF_TEST("移動建構：接手資料，來源變成空") {
  Buffer a(4);
  a.set(0, 9);
  Buffer b(std::move(a));
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(4));
  CF_EXPECT_EQ(b.at(0), 9);
  CF_EXPECT_EQ(a.empty(), true);
  CF_EXPECT_EQ(a.size(), static_cast<std::size_t>(0));
}

CF_TEST("移動賦值：接手資料，來源變成空") {
  Buffer a(2);
  a.set(0, 5);
  Buffer b(7);
  b = std::move(a);
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(2));
  CF_EXPECT_EQ(b.at(0), 5);
  CF_EXPECT_EQ(a.empty(), true);
}

CF_TEST("移動後來源可以被重新使用") {
  Buffer a(2);
  Buffer b(std::move(a));
  a = Buffer(3);
  a.set(2, 1);
  CF_EXPECT_EQ(a.size(), static_cast<std::size_t>(3));
  CF_EXPECT_EQ(a.at(2), 1);
}

CF_TEST("複製被禁用（所有權唯一）") {
  static_assert(!std::is_copy_constructible_v<Buffer>, "Buffer 不該可複製");
  static_assert(!std::is_copy_assignable_v<Buffer>, "Buffer 不該可複製賦值");
  CF_EXPECT(true);
}

int main() { return cf::run_all(); }
