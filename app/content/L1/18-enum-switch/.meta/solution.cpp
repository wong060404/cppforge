// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

namespace {
constexpr int kCount = 4;
}

Direction turn_right(Direction d) {
  // 先取模再轉回來，才不會造出不合法的列舉值
  return static_cast<Direction>((static_cast<int>(d) + 1) % kCount);
}

std::string to_chinese(Direction d) {
  // 窮舉式 switch：不寫 default，漏 case 時 -Wswitch 會直接報錯
  switch (d) {
    case Direction::North: return "北";
    case Direction::East:  return "東";
    case Direction::South: return "南";
    case Direction::West:  return "西";
  }
  return "?";
}

std::pair<int, int> delta(Direction d) {
  switch (d) {
    case Direction::North: return {0, 1};
    case Direction::East:  return {1, 0};
    case Direction::South: return {0, -1};
    case Direction::West:  return {-1, 0};
  }
  return {0, 0};
}
