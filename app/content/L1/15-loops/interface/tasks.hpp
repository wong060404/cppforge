#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <optional>
#include <string>

// 回傳 n 的階乘；n <= 0 時回傳 1
long long factorial(int n);

// 回傳 n 是否為質數；n < 2 時回傳 false
bool is_prime(int n);

// 回傳第一個「不是空白」的字元索引；整串都是空白或空字串時回傳 nullopt
std::optional<std::size_t> first_non_space(const std::string& s);
