// 起始碼（標頭檔提交）：兩個函式都「答案正確、代價太高」。
// 提示：一個是雙迴圈（O(n²)）、一個先排序再取最後兩個（O(n log n) 且遇到重複最大值會出錯）。
#pragma once

#include "tasks.hpp"

#include <algorithm>

template <class T>
std::size_t count_duplicates(const std::vector<T>& v) {
  std::size_t dup = 0;
  for (std::size_t i = 0; i < v.size(); ++i) {
    bool already_counted = false;
    for (std::size_t j = 0; j < i; ++j) {
      if (v[i] == v[j]) {
        already_counted = true;
        break;
      }
    }
    if (already_counted) {
      continue;
    }
    for (std::size_t j = i + 1; j < v.size(); ++j) {
      if (v[i] == v[j]) {
        ++dup;
        break;
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
  std::vector<T> copy = v;
  std::sort(copy.begin(), copy.end());   // O(n log n)，但我們只需要兩個值
  return std::make_pair(copy[copy.size() - 1], copy[copy.size() - 2]);
}
