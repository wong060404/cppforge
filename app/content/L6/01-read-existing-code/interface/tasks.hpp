#pragma once
// 這個介面不可修改：你只能實作它。
// 你可以使用（但不能修改）同事寫好的 stats.hpp 與 format.hpp。
#include <string>
#include <vector>

// 回傳一行摘要，格式固定為：
//   "n=<n> min=<min> max=<max> mean=<平均，兩位小數>"
// 例：{0, 10, 20} → "n=3 min=0 max=20 mean=15.00"
// 空輸入 → "no data"
std::string summary_line(const std::vector<int>& samples);

// 回傳高於「平均」的元素比例，一位小數百分比：
//   "above=<百分比>%"
// 例：{0, 10, 20} 的平均是 15，高於 15 的只有 20 → "above=33.3%"
// 空輸入、或平均為 0 → "above=0.0%"
std::string above_average_line(const std::vector<int>& samples);
