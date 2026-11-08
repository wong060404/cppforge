#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>

// 回傳「p 的下一個元素」的位址（即 p + 1）
const int* next(const int* p);

// 在 [begin, end) 之間找第一個等於 target 的元素；找不到回 nullptr
const int* find_value(const int* begin, const int* end, int target);

// 二維陣列（row-major）的扁平索引：m[row][col]，每列有 cols 個元素
std::size_t flat_index(std::size_t row, std::size_t col, std::size_t cols);
