#pragma once
// 這個介面不可修改：你只能實作它。

// int 型別佔幾個「位元」（不是位元組）
int int_bits();

// v 是否落在 short 能表示的範圍內
bool fits_in_short(long long v);

// v 的最低 8 位（結果在 0..255）
unsigned char low_byte(unsigned v);
