#include "cf_test.hpp"
#include "tasks.hpp"

#include <stdexcept>

CF_TEST("建構後初始為 0，上限正確") {
  const Counter c(5);
  CF_EXPECT_EQ(c.value(), 0);
  CF_EXPECT_EQ(c.max_value(), 5);
}

CF_TEST("上限為 0 必須丟 invalid_argument") {
  CF_EXPECT_THROW(Counter(0), std::invalid_argument);
}

CF_TEST("上限為負必須丟 invalid_argument") {
  CF_EXPECT_THROW(Counter(-1), std::invalid_argument);
}

CF_TEST("increment：連續三次等於 3") {
  Counter c(5);
  c.increment();
  c.increment();
  c.increment();
  CF_EXPECT_EQ(c.value(), 3);
}

CF_TEST("increment：到上限就停住（不超過、不丟例外）") {
  Counter c(2);
  c.increment();
  c.increment();
  c.increment();
  c.increment();
  CF_EXPECT_EQ(c.value(), 2);
  CF_EXPECT_EQ(c.is_full(), true);
}

CF_TEST("add：正常增加") {
  Counter c(10);
  c.add(3);
  CF_EXPECT_EQ(c.value(), 3);
}

CF_TEST("add：超過上限要夾住") {
  Counter c(5);
  c.add(99);
  CF_EXPECT_EQ(c.value(), 5);
  CF_EXPECT_EQ(c.is_full(), true);
}

CF_TEST("add：負數必須丟 invalid_argument 且不改變狀態") {
  Counter c(5);
  c.add(2);
  CF_EXPECT_THROW(c.add(-1), std::invalid_argument);
  CF_EXPECT_EQ(c.value(), 2);
}

CF_TEST("is_full：初始為 false") {
  const Counter c(3);
  CF_EXPECT_EQ(c.is_full(), false);
}

CF_TEST("const 物件也能讀狀態（const-correctness）") {
  Counter c(4);
  c.add(4);
  const Counter& ref = c;
  CF_EXPECT_EQ(ref.value(), 4);
  CF_EXPECT_EQ(ref.max_value(), 4);
  CF_EXPECT_EQ(ref.is_full(), true);
}

int main() { return cf::run_all(); }
