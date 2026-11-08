#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <vector>

// 回傳去重且遞增排序的結果（不改動傳入的 vector）
std::vector<int> unique_sorted(const std::vector<int>& v);

// 就地移除所有等於 value 的元素，回傳移除後的 size
std::size_t remove_all(std::vector<int>& v, int value);

// 回傳同時存在於 a 與 b 的元素（去重、遞增排序）
std::vector<int> intersect_sorted(const std::vector<int>& a, const std::vector<int>& b);
