#pragma once
// 這個介面不可修改：你只能實作它。

struct Point {
  int x;
  int y;
};

struct Rect {
  Point top_left;
  Point bottom_right;
};

// 兩點的曼哈頓距離：|dx| + |dy|
int manhattan(Point a, Point b);

// 矩形面積；若 bottom_right 在 top_left 的左方或上方（退化矩形）回傳 0
int rect_area(const Rect& r);

// 點是否落在矩形內（含邊界）
bool rect_contains(const Rect& r, Point p);
