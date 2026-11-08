#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <optional>
#include <vector>

// 回傳 a 與 b 的平均，採「向零截斷」（與整數除法 a / 2 的行為一致）。
// 不得發生整數溢位 —— a、b 可能接近 INT_MAX / INT_MIN。
int midpoint(int a, int b);

// 回傳 v[i]；i 越界時回傳 std::nullopt（不得拋出例外）
std::optional<int> safe_at(const std::vector<int>& v, std::size_t i);

// 把 x 夾到 [0, 255] 之後轉成 unsigned char
unsigned char clamp_byte(int x);

// 建立長度 n 的整數陣列，全部填 42，回傳第一個元素。
// n == 0 時回傳 0。呼叫者不負責釋放 —— 內部必須自己管理。
int first_of(std::size_t n);
