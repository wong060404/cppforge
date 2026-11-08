#pragma once
// 這個介面不可修改：你只能實作它。

// a 與 b 是否「幾乎相等」：採用相對誤差，容忍度 1e-9
// （即 |a-b| <= 1e-9 * max(1, |a|, |b|)）
bool nearly_equal(double a, double b);

// 三個數的平均（必須保留小數）
double mean3(double a, double b, double c);

// x 是否為正無限大（+inf）
bool is_positive_inf(double x);
