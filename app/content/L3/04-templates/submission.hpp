// 起始碼（標頭檔提交）：三個地方漏了。
// 提示：一個迴圈漏了第一個元素、一個用 >= 而不是 >、一個把兩個值放反。
#pragma once

#include "tasks.hpp"

template <Addable T>
T sum_all(const std::vector<T>& v) {
  T total{};
  for (std::size_t i = 1; i < v.size(); ++i) {  // 從 1 開始 → 漏掉 v[0]
    total = total + v[i];
  }
  return total;
}

template <class T>
std::vector<T> greater_than(const std::vector<T>& v, const T& threshold) {
  std::vector<T> out;
  for (const auto& x : v) {
    if (x >= threshold) {  // 介面要求「嚴格大於」
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
  return {hi, lo};  // 介面是 {最小, 最大}
}
