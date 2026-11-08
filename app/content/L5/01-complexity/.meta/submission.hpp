// 參考解（內容 CI 用；學員端不可見）
#pragma once

#include "tasks.hpp"

#include <algorithm>

template <class T>
std::size_t count_duplicates(const std::vector<T>& v) {
  if (v.size() < 2) {
    return 0;
  }
  std::vector<T> copy = v;
  std::sort(copy.begin(), copy.end());          // O(n log n)
  std::size_t dup = 0;
  for (std::size_t i = 1; i < copy.size(); ++i) {
    if (copy[i] == copy[i - 1]) {               // 相鄰相等 = 重複
      ++dup;
      // 跳過同一組重複（避免重複計數）
      while (i + 1 < copy.size() && copy[i + 1] == copy[i]) {
        ++i;
      }
    }
  }
  return dup;
}

template <class T>
std::optional<std::pair<T, T>> top_two(const std::vector<T>& v) {
  if (v.size() < 2) {
    return std::nullopt;
  }
  T best = v[0];
  T second = v[0];
  bool has_second = false;
  for (std::size_t i = 1; i < v.size(); ++i) {
    if (v[i] > best) {
      second = best;
      best = v[i];
      has_second = true;
    } else if (v[i] < best) {
      if (!has_second || v[i] > second) {
        second = v[i];
        has_second = true;
      }
    }
  }
  if (!has_second) {
    return std::nullopt;
  }
  return std::make_pair(best, second);
}
