// 參考解（內容 CI 用；學員端不可見）
#pragma once

#include "tasks.hpp"

template <Addable T>
T sum_all(const std::vector<T>& v) {
  T total{};
  for (std::size_t i = 0; i < v.size(); ++i) {   // 從 0 開始
    total = total + v[i];
  }
  return total;
}

template <class T>
std::vector<T> greater_than(const std::vector<T>& v, const T& threshold) {
  std::vector<T> out;
  for (const auto& x : v) {
    if (x > threshold) {                          // 嚴格大於
      out.push_back(x);
    }
  }
  return out;
}

template <class T>
std::pair<T, T> min_max(const std::vector<T>& v) {
  if (v.empty()) {
    return {T{}, T{}};
  }
  T lo = v.front();
  T hi = v.front();
  for (const auto& x : v) {
    if (x < lo) lo = x;
    if (x > hi) hi = x;
  }
  return {lo, hi};                                // {最小, 最大}
}
