#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <optional>
#include <utility>
#include <vector>

// 回傳第一個「嚴格大於」threshold 的元素的索引；沒有則回傳 std::nullopt
std::optional<std::size_t> find_first_above(const std::vector<int>& v, int threshold);

// 回傳 {最小值, 最大值}；空 vector 回傳 std::nullopt
std::optional<std::pair<int, int>> min_max(const std::vector<int>& v);
