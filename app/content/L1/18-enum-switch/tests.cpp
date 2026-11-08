#include "cf_test.hpp"
#include "tasks.hpp"

#include <string>
#include <utility>

CF_TEST("turn_right：North → East") {
  CF_EXPECT(turn_right(Direction::North) == Direction::East);
}

CF_TEST("turn_right：East → South") {
  CF_EXPECT(turn_right(Direction::East) == Direction::South);
}

CF_TEST("turn_right：West 要繞回 North（不能變成不合法的值）") {
  CF_EXPECT(turn_right(Direction::West) == Direction::North);
}

CF_TEST("turn_right：連轉四次回到原點") {
  Direction d = Direction::South;
  for (int i = 0; i < 4; ++i) d = turn_right(d);
  CF_EXPECT(d == Direction::South);
}

CF_TEST("to_chinese：四個方位都要有名字") {
  CF_EXPECT_EQ(to_chinese(Direction::North), std::string("北"));
  CF_EXPECT_EQ(to_chinese(Direction::East), std::string("東"));
  CF_EXPECT_EQ(to_chinese(Direction::South), std::string("南"));
  CF_EXPECT_EQ(to_chinese(Direction::West), std::string("西"));
}

CF_TEST("delta：North 是 (0, 1)") {
  const auto d = delta(Direction::North);
  CF_EXPECT_EQ(d.first, 0);
  CF_EXPECT_EQ(d.second, 1);
}

CF_TEST("delta：East 是 (1, 0)") {
  const auto d = delta(Direction::East);
  CF_EXPECT_EQ(d.first, 1);
  CF_EXPECT_EQ(d.second, 0);
}

CF_TEST("delta：South 是 (0, -1)") {
  const auto d = delta(Direction::South);
  CF_EXPECT_EQ(d.first, 0);
  CF_EXPECT_EQ(d.second, -1);
}

CF_TEST("delta：West 是 (-1, 0)") {
  const auto d = delta(Direction::West);
  CF_EXPECT_EQ(d.first, -1);
  CF_EXPECT_EQ(d.second, 0);
}

CF_TEST("delta：四個方向的位移兩兩不同") {
  const auto n = delta(Direction::North);
  const auto e = delta(Direction::East);
  const auto s = delta(Direction::South);
  const auto w = delta(Direction::West);
  CF_EXPECT(!(n == s));
  CF_EXPECT(!(e == w));
  CF_EXPECT(!(n == e));
}

int main() { return cf::run_all(); }
