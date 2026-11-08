#pragma once
// 這個介面不可修改。
#include <cstddef>

// 由隊友在 geometry.cpp 實作（你不需要改它）
int rect_area(int w, int h);
int rect_perimeter(int w, int h);

// 你的任務：在 submission.cpp 提供這個函式的「定義」。
// 注意簽章必須與這一行完全一致，否則連結器找不到它。
int square_area(int side);
