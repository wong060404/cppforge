#pragma once
// 這個介面不可修改：你只能實作它。
#include <array>
#include <cstddef>

// 回傳五個元素的總和
int sum_array(const std::array<int, 5>& a);

// 就地反轉
void reverse_array(std::array<int, 5>& a);

// 回傳最大值的「索引」（若有多個最大值，回傳最前面那個）
std::size_t index_of_max(const std::array<int, 5>& a);
