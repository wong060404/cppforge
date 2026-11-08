#pragma once
// 這個介面不可修改：你只能實作它。
#include <string>

// 成績等級：>=90 "A"、>=80 "B"、>=70 "C"、>=60 "D"、其餘 "F"
std::string grade(int score);

// 把 x 夾到 [lo, hi]；若 lo > hi 則先交換兩者再夾
int clamp(int x, int lo, int hi);

// 閏年：4 的倍數，但 100 的倍數不算，除非又是 400 的倍數
bool is_leap(int year);
