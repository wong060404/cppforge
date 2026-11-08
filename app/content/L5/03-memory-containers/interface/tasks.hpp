#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <vector>

// 回傳 0², 1², ..., (n-1)²（n 個元素）。
// 效能要求：必須先 reserve，不要讓 push_back 反覆重新配置。
std::vector<long long> squares(std::size_t n);

// 回傳 v 中所有偶數，保持原本順序。
// 效能要求：必須先 reserve。
std::vector<int> evens(const std::vector<int>& v);

// 就地由小到大排序（不得配置新容器、不得回傳新 vector）。
void sort_in_place(std::vector<int>& v);
