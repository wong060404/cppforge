#include "cf_test.hpp"
#include "tasks.hpp"

#include <string>
#include <vector>

CF_TEST("length_of：一般字串") {
  CF_EXPECT_EQ(length_of("hello"), static_cast<std::size_t>(5));
}

CF_TEST("length_of：空字串與 UTF-8 位元組數") {
  CF_EXPECT_EQ(length_of(""), static_cast<std::size_t>(0));
  // "中" 在 UTF-8 是 3 個位元組：size() 算的是位元組，不是字元
  CF_EXPECT_EQ(length_of("中"), static_cast<std::size_t>(3));
}

CF_TEST("add_bang：必須改到呼叫者的變數") {
  std::string s = "hi";
  add_bang(s);
  CF_EXPECT_EQ(s, std::string("hi!"));
}

CF_TEST("add_bang：可以連續呼叫") {
  std::string s = "a";
  add_bang(s);
  add_bang(s);
  CF_EXPECT_EQ(s, std::string("a!!"));
}

CF_TEST("add_bang：空字串也要作用") {
  std::string s;
  add_bang(s);
  CF_EXPECT_EQ(s, std::string("!"));
}

CF_TEST("swap_ints：兩個值互換") {
  int a = 1;
  int b = 2;
  swap_ints(a, b);
  CF_EXPECT_EQ(a, 2);
  CF_EXPECT_EQ(b, 1);
}

CF_TEST("swap_ints：相同值不出錯") {
  int a = 7;
  int b = 7;
  swap_ints(a, b);
  CF_EXPECT_EQ(a, 7);
  CF_EXPECT_EQ(b, 7);
}

CF_TEST("total_of：正負數混合") {
  const std::vector<int> v{1, -2, 3, -4};
  CF_EXPECT_EQ(total_of(v), -2LL);
}

CF_TEST("total_of：空 vector") {
  const std::vector<int> v;
  CF_EXPECT_EQ(total_of(v), 0LL);
}

int main() { return cf::run_all(); }
