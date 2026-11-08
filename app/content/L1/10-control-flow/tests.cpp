#include "cf_test.hpp"
#include "tasks.hpp"

#include <string>

CF_TEST("sum_range：1..5 的半開區間和是 10") {
  CF_EXPECT_EQ(sum_range(1, 5), 10LL);   // 1+2+3+4
}

CF_TEST("sum_range：空區間回傳 0") {
  CF_EXPECT_EQ(sum_range(3, 3), 0LL);
}

CF_TEST("sum_range：反向區間回傳 0") {
  CF_EXPECT_EQ(sum_range(5, 1), 0LL);
}

CF_TEST("sum_range：負數區間") {
  CF_EXPECT_EQ(sum_range(-2, 2), -2LL);  // -2 + -1 + 0 + 1
}

CF_TEST("sum_range：單一元素區間") {
  CF_EXPECT_EQ(sum_range(7, 8), 7LL);
}

CF_TEST("fizz_buzz：前 5 項") {
  CF_EXPECT_EQ(fizz_buzz(5), std::string("1,2,Fizz,4,Buzz"));
}

CF_TEST("fizz_buzz：15 必須是 FizzBuzz") {
  CF_EXPECT_EQ(fizz_buzz(15), std::string("1,2,Fizz,4,Buzz,Fizz,7,8,Fizz,Buzz,11,Fizz,13,14,FizzBuzz"));
}

CF_TEST("fizz_buzz：n = 0 回傳空字串") {
  CF_EXPECT_EQ(fizz_buzz(0), std::string(""));
}

CF_TEST("fizz_buzz：n 為負也回傳空字串") {
  CF_EXPECT_EQ(fizz_buzz(-3), std::string(""));
}

int main() { return cf::run_all(); }
