#pragma once
// 這個介面不可修改：你只能實作它（實作請寫在 submission.hpp）。
#include <cstddef>
#include <optional>
#include <utility>
#include <vector>

// 回傳「重複出現的元素個數」：同一元素不論重複幾次都只算一次。
// 例：{1,2,2,3,3,3} → 2（2 與 3）
//
// 效能要求：比較次數必須是 O(n log n)（評測會用會計數的型別檢查）
template <class T>
std::size_t count_duplicates(const std::vector<T>& v);

// 回傳 {最大, 次大}；次大必須**嚴格小於**最大。
// 元素少於 2 個，或所有元素都相同 → std::nullopt。
//
// 效能要求：比較次數必須是 O(n)（不可以用排序）
template <class T>
std::optional<std::pair<T, T>> top_two(const std::vector<T>& v);
