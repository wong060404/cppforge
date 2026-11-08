#pragma once
// 這個介面不可修改：你只能實作它。

// a 的 b 次方；b >= 0。int_pow(2, 10) == 1024
long long int_pow(int a, unsigned b);

// 三個整數的最大值
int max3(int a, int b, int c);

// x 是否在 [lo, hi] 內（含邊界）。lo <= hi 保證成立。
bool in_range(int x, int lo, int hi);
