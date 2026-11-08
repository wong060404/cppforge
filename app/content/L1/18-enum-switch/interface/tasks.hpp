#pragma once
// 這個介面不可修改：你只能實作它。
#include <string>
#include <utility>

enum class Direction { North, East, South, West };

// 順時針轉 90 度（West 之後繞回 North）
Direction turn_right(Direction d);

// 回傳「北」「東」「南」「西」
std::string to_chinese(Direction d);

// 回傳該方位前進一格的位移：北(0,1) 東(1,0) 南(0,-1) 西(-1,0)
std::pair<int, int> delta(Direction d);
