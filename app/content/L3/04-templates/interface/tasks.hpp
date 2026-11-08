#pragma once
// 這個介面不可修改：你只能實作它（實作請寫在 submission.hpp）。
#include <concepts>
#include <utility>
#include <vector>

// 支援 a + b 且結果可轉成型別 T
template <class T>
concept Addable = requires(T a, T b) {
  { a + b } -> std::convertible_to<T>;
};

// 元素和；空 vector 回傳 T{}
template <Addable T>
T sum_all(const std::vector<T>& v);

// 嚴格大於 threshold 的元素，保持原順序
template <class T>
std::vector<T> greater_than(const std::vector<T>& v, const T& threshold);

// 回傳 {最小值, 最大值}；空 vector 回傳 {T{}, T{}}
template <class T>
std::pair<T, T> min_max(const std::vector<T>& v);
