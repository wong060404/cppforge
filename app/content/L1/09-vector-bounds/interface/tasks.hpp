#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <vector>

// 回傳第 i 個元素；i 越界時回傳 0
int safe_at(const std::vector<int>& v, std::size_t i);

// 回傳最大值；空 vector 回傳 0
int max_or_zero(const std::vector<int>& v);

// 回傳嚴格大於 threshold 的元素個數
std::size_t count_above(const std::vector<int>& v, int threshold);
