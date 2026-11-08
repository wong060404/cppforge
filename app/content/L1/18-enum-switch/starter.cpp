// 起始碼：三個函式各有一個錯。
// 提示：一個忘了繞回、一個被 default 蓋住漏掉的 case、一個正負號寫反。
#include "tasks.hpp"

Direction turn_right(Direction d) {
  // West(3) + 1 = 4，已經不是合法的 Direction
  return static_cast<Direction>(static_cast<int>(d) + 1);
}

std::string to_chinese(Direction d) {
  switch (d) {
    case Direction::North:
      return "北";
    case Direction::East:
      return "東";
    case Direction::West:
      return "西";
    default:            // 這裡吞掉了 South
      return "?";
  }
}

std::pair<int, int> delta(Direction d) {
  switch (d) {
    case Direction::North:
      return {0, 1};
    case Direction::East:
      return {1, 0};
    case Direction::South:
      return {0, 1};    // 南應該是 (0,-1)
    case Direction::West:
      return {-1, 0};
  }
  return {0, 0};
}
