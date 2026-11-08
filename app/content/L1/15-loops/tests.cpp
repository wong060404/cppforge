#include "cf_test.hpp"
#include "tasks.hpp"

#include <optional>
#include <string>

CF_TEST("factorial：0 與 1 都是 1") {
  CF_EXPECT_EQ(factorial(0), 1LL);
  CF_EXPECT_EQ(factorial(1), 1LL);
}

CF_TEST("factorial：5! = 120") {
  CF_EXPECT_EQ(factorial(5), 120LL);
}

CF_TEST("factorial：10! = 3628800（需要 long long 才不溢位）") {
  CF_EXPECT_EQ(factorial(10), 3628800LL);
}

CF_TEST("factorial：負數回傳 1") {
  CF_EXPECT_EQ(factorial(-3), 1LL);
}

CF_TEST("is_prime：2 是質數（唯一是偶數的質數）") {
  CF_EXPECT_EQ(is_prime(2), true);
}

CF_TEST("is_prime：小於 2 都不是質數") {
  CF_EXPECT_EQ(is_prime(0), false);
  CF_EXPECT_EQ(is_prime(1), false);
}

CF_TEST("is_prime：9 與 15 不是質數") {
  CF_EXPECT_EQ(is_prime(9), false);
  CF_EXPECT_EQ(is_prime(15), false);
}

CF_TEST("is_prime：97 是質數") {
  CF_EXPECT_EQ(is_prime(97), true);
}

CF_TEST("first_non_space：跳過前導空白") {
  const auto r = first_non_space("  ab");
  CF_EXPECT(r.has_value());
  CF_EXPECT_EQ(*r, static_cast<std::size_t>(2));
}

CF_TEST("first_non_space：沒有空白時是 0") {
  const auto r = first_non_space("abc");
  CF_EXPECT(r.has_value());
  CF_EXPECT_EQ(*r, static_cast<std::size_t>(0));
}

CF_TEST("first_non_space：全是空白或空字串回傳 nullopt") {
  CF_EXPECT_EQ(first_non_space("   ").has_value(), false);
  CF_EXPECT_EQ(first_non_space("").has_value(), false);
}

int main() { return cf::run_all(); }
