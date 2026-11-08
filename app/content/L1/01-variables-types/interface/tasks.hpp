#pragma once
// 這個介面不可修改：它描述的就是規格（包含回傳型別）。
#include <string>

// 三個整數的平均；必須保留小數（例：average3(1, 2, 2) == 5.0 / 3.0）
double average3(int a, int b, int c);

// x 是否為偶數（含負數：-4 是偶數、-3 不是）
bool is_even(int x);

// x 的符號："negative"（<0）、"zero"（==0）、"positive"（>0）
std::string describe_sign(int x);
