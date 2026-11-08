#include "cf_test.hpp"
#include "tasks.hpp"

#include <cmath>
#include <sstream>
#include <string>

CF_TEST("建構與存取") {
  const Vec2 v(3, -4);
  CF_EXPECT_EQ(v.x(), 3);
  CF_EXPECT_EQ(v.y(), -4);
}

CF_TEST("+=：兩軸都要更新") {
  Vec2 a(1, 2);
  const Vec2 b(3, 4);
  a += b;
  CF_EXPECT_EQ(a.x(), 4);
  CF_EXPECT_EQ(a.y(), 6);
}

CF_TEST("+=：回傳的是 *this 的參考（可鏈式）") {
  Vec2 a(1, 2);
  const Vec2 b(1, 1);
  Vec2& r = (a += b);
  CF_EXPECT(&r == &a);
}

CF_TEST("+=：鏈式寫法 (a += b) += c") {
  Vec2 a(0, 0);
  const Vec2 b(1, 2);
  const Vec2 c(10, 20);
  (a += b) += c;
  CF_EXPECT_EQ(a.x(), 11);
  CF_EXPECT_EQ(a.y(), 22);
}

CF_TEST("==：兩軸相同才算相等") {
  CF_EXPECT_EQ(Vec2(1, 2) == Vec2(1, 2), true);
}

CF_TEST("==：只有 y 不同時必須是 false") {
  CF_EXPECT_EQ(Vec2(1, 2) == Vec2(1, 9), false);
}

CF_TEST("==：只有 x 不同時必須是 false") {
  CF_EXPECT_EQ(Vec2(5, 2) == Vec2(1, 2), false);
}

CF_TEST("length：3-4-5 直角三角形") {
  const Vec2 v(3, 4);
  CF_EXPECT_NEAR(v.length(), 5.0, 1e-9);
}

CF_TEST("length：原點為 0") {
  const Vec2 v(0, 0);
  CF_EXPECT_NEAR(v.length(), 0.0, 1e-9);
}

CF_TEST("operator<<：格式必須是 (x, y)") {
  std::ostringstream os;
  os << Vec2(1, 2);
  CF_EXPECT_EQ(os.str(), std::string("(1, 2)"));
}

CF_TEST("operator<<：負數與 0") {
  std::ostringstream os;
  os << Vec2(-3, 0);
  CF_EXPECT_EQ(os.str(), std::string("(-3, 0)"));
}

CF_TEST("operator<<：可以串接多個物件") {
  std::ostringstream os;
  os << Vec2(1, 2) << " + " << Vec2(3, 4);
  CF_EXPECT_EQ(os.str(), std::string("(1, 2) + (3, 4)"));
}

int main() { return cf::run_all(); }
