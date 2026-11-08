#include "cf_test.hpp"
#include "tasks.hpp"

#include <string>

CF_TEST("grade：各等級的中間值") {
  CF_EXPECT_EQ(grade(95), std::string("A"));
  CF_EXPECT_EQ(grade(85), std::string("B"));
  CF_EXPECT_EQ(grade(75), std::string("C"));
  CF_EXPECT_EQ(grade(65), std::string("D"));
  CF_EXPECT_EQ(grade(30), std::string("F"));
}

CF_TEST("grade：邊界值 90 / 80 / 70 / 60 要落在較高的等級") {
  CF_EXPECT_EQ(grade(90), std::string("A"));
  CF_EXPECT_EQ(grade(80), std::string("B"));
  CF_EXPECT_EQ(grade(70), std::string("C"));
  CF_EXPECT_EQ(grade(60), std::string("D"));
}

CF_TEST("grade：59 分與 0 分都是 F") {
  CF_EXPECT_EQ(grade(59), std::string("F"));
  CF_EXPECT_EQ(grade(0), std::string("F"));
}

CF_TEST("clamp：範圍內原樣回傳") {
  CF_EXPECT_EQ(clamp(5, 0, 10), 5);
  CF_EXPECT_EQ(clamp(0, 0, 10), 0);
  CF_EXPECT_EQ(clamp(10, 0, 10), 10);
}

CF_TEST("clamp：超出範圍時夾到邊界") {
  CF_EXPECT_EQ(clamp(-5, 0, 10), 0);
  CF_EXPECT_EQ(clamp(99, 0, 10), 10);
}

CF_TEST("clamp：lo > hi 時要先交換") {
  CF_EXPECT_EQ(clamp(5, 10, 0), 5);
  CF_EXPECT_EQ(clamp(-3, 10, 0), 0);
  CF_EXPECT_EQ(clamp(99, 10, 0), 10);
}

CF_TEST("is_leap：一般 4 的倍數") {
  CF_EXPECT_EQ(is_leap(2024), true);
  CF_EXPECT_EQ(is_leap(2023), false);
}

CF_TEST("is_leap：100 的倍數不是閏年") {
  CF_EXPECT_EQ(is_leap(1900), false);
  CF_EXPECT_EQ(is_leap(2100), false);
}

CF_TEST("is_leap：400 的倍數仍是閏年") {
  CF_EXPECT_EQ(is_leap(2000), true);
  CF_EXPECT_EQ(is_leap(1600), true);
}

int main() { return cf::run_all(); }
