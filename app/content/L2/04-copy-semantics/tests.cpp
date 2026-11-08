#include "cf_test.hpp"
#include "tasks.hpp"

#include <stdexcept>

namespace {
IntArray make(int a, int b, int c) {
  IntArray arr(3);
  arr.set(0, a);
  arr.set(1, b);
  arr.set(2, c);
  return arr;
}
}

CF_TEST("建構後大小正確、內容為 0") {
  const IntArray a(3);
  CF_EXPECT_EQ(a.size(), static_cast<std::size_t>(3));
  CF_EXPECT_EQ(a.at(0), 0);
  CF_EXPECT_EQ(a.at(2), 0);
}

CF_TEST("set 與 at 往返") {
  IntArray a(2);
  a.set(1, 7);
  CF_EXPECT_EQ(a.at(1), 7);
}

CF_TEST("at 越界丟 out_of_range") {
  const IntArray a(2);
  CF_EXPECT_THROW(a.at(2), std::out_of_range);
}

CF_TEST("複製建構：內容必須一起複製過來") {
  IntArray a = make(10, 20, 30);
  IntArray b = a;
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(3));
  CF_EXPECT_EQ(b.at(0), 10);
  CF_EXPECT_EQ(b.at(1), 20);
  CF_EXPECT_EQ(b.at(2), 30);
}

CF_TEST("複製建構：兩邊各自獨立（改副本不影響原物件）") {
  IntArray a = make(1, 2, 3);
  IntArray b = a;
  b.set(0, 99);
  CF_EXPECT_EQ(a.at(0), 1);
  CF_EXPECT_EQ(b.at(0), 99);
}

CF_TEST("複製賦值：內容與大小都要正確") {
  IntArray a = make(4, 5, 6);
  IntArray b(1);
  b = a;
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(3));
  CF_EXPECT_EQ(b.at(0), 4);
  CF_EXPECT_EQ(b.at(2), 6);
}

CF_TEST("複製賦值：目標原本已有資料也不能出錯（且不可洩漏）") {
  IntArray a = make(7, 8, 9);
  IntArray b = make(1, 1, 1);
  b = a;
  CF_EXPECT_EQ(b.at(0), 7);
  CF_EXPECT_EQ(a.at(0), 7);
}

CF_TEST("自我賦值安全") {
  IntArray a = make(3, 2, 1);
  const IntArray& alias = a;
  a = alias;
  CF_EXPECT_EQ(a.size(), static_cast<std::size_t>(3));
  CF_EXPECT_EQ(a.at(0), 3);
}

CF_TEST("空陣列複製與賦值") {
  const IntArray empty(0);
  IntArray copy = empty;
  CF_EXPECT_EQ(copy.size(), static_cast<std::size_t>(0));

  IntArray b = make(1, 2, 3);
  b = empty;
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(0));
}

int main() { return cf::run_all(); }
