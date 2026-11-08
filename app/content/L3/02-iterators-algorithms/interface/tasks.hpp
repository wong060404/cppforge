#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <vector>

// 回傳偶數的個數
std::size_t count_even(const std::vector<int>& v);

// 回傳排序後的副本；不得改動傳入的 vector
std::vector<int> sorted_copy(const std::vector<int>& v);

// v 中是否有負數
bool any_negative(const std::vector<int>& v);

// 回傳最大值；空 vector 回傳 0
int max_or_zero(const std::vector<int>& v);
