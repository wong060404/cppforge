#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>

// a 與 b 的整數平均（結果向零截斷）
int int_average(int a, int b);

// a 與 b 的浮點平均
double real_average(int a, int b);

// part 佔 whole 的百分比（0..100），四捨五入到整數；whole == 0 時回傳 0
int percent(int part, int whole);
