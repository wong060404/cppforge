#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <vector>

// 回傳前 n 個元素的總和。
// 若 n 大於 values.size()，只加總實際存在的元素（不得越界）。
int sum_first_n(const std::vector<int>& values, std::size_t n);
