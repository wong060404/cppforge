#pragma once
// 這個介面不可修改（「同事寫好的」格式化模組）。
#include <string>

namespace fmt {

// 固定小數位輸出，例如 fixed(1.5, 2) == "1.50"、fixed(4.0, 1) == "4.0"
// 負數保留符號。四捨五入採「最近偶數」（banker's rounding）。
std::string fixed(double value, int decimals);

// 把比例轉成百分比字串，一位小數。例如 percent(0.5) == "50.0%"
std::string percent(double ratio);

}  // namespace fmt
