#include "cf_test.hpp"
#include "tasks.hpp"

#include <stdexcept>
#include <type_traits>

CF_TEST("建構後大小正確") {
  const Buffer b(3);
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(3));
}

CF_TEST("建構後元素全部為 0（值初始化）") {
  const Buffer b(4);
  CF_EXPECT_EQ(b.at(0), 0);
  CF_EXPECT_EQ(b.at(3), 0);
}

CF_TEST("set 與 at 可以往返") {
  Buffer b(3);
  b.set(0, 10);
  b.set(1, 20);
  b.set(2, 30);
  CF_EXPECT_EQ(b.at(0), 10);
  CF_EXPECT_EQ(b.at(1), 20);
  CF_EXPECT_EQ(b.at(2), 30);
}

CF_TEST("at：越界丟 out_of_range") {
  const Buffer b(3);
  CF_EXPECT_THROW(b.at(3), std::out_of_range);
}

CF_TEST("set：越界丟 out_of_range 且不改變既有內容") {
  Buffer b(3);
  b.set(0, 7);
  CF_EXPECT_THROW(b.set(3, 99), std::out_of_range);
  CF_EXPECT_EQ(b.at(0), 7);
}

CF_TEST("大小為 0 的 Buffer 可以建立，且任何索引都越界") {
  Buffer b(0);
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(0));
  CF_EXPECT_THROW(b.at(0), std::out_of_range);
}

CF_TEST("複製已被禁用（所有權唯一）") {
  static_assert(!std::is_copy_constructible_v<Buffer>, "Buffer 不該可複製");
  static_assert(!std::is_copy_assignable_v<Buffer>, "Buffer 不該可複製賦值");
  CF_EXPECT(true);
}

CF_TEST("大量建立與銷毀不該出錯") {
  for (int i = 0; i < 50; ++i) {
    Buffer b(16);
    b.set(15, i);
    CF_EXPECT_EQ(b.at(15), i);
  }
}

int main() { return cf::run_all(); }
