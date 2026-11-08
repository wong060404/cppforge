#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <functional>
#include <vector>

// 用 k 個執行緒分段求總和。
// 需求：k >= 1；若 k > n 則實際執行緒數夾到 n；
//       分段必須覆蓋全部元素（含 n % k 的餘數）。
long long parallel_sum(const std::vector<int>& v, unsigned k);

// 用 k 個執行緒計算滿足 pred 的元素個數。
// 需求：共享計數器必須使用 std::atomic（靜態規則會檢查原始碼）。
std::size_t parallel_count(const std::vector<int>& v,
                           const std::function<bool(int)>& pred, unsigned k);

// 回傳長度 n 的 vector，其中 out[i] == i * 2，且必須由多個執行緒分工計算。
std::vector<long long> parallel_fill(std::size_t n, unsigned k);
