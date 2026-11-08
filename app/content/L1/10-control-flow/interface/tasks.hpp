#pragma once
// 這個介面不可修改：你只能實作它。
#include <string>

// 回傳 [from, to) 的整數總和；若 from >= to 回傳 0
long long sum_range(int from, int to);

// FizzBuzz：把 1..n（含 n）的結果用逗號串成一個字串
// n <= 0 時回傳空字串
std::string fizz_buzz(int n);
