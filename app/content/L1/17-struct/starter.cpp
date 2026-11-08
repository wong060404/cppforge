// 起始碼：三個函式各有一個錯。
// 提示：一個公式寫錯、一個沒處理退化矩形、一個邊界比較用錯了。
#include "tasks.hpp"

int manhattan(Point a, Point b) {
  // 曼哈頓距離是「x 的差 + y 的差」，這裡寫成了加總座標
  return (a.x + b.x) - (a.y + b.y);
}

int rect_area(const Rect& r) {
  const int w = r.bottom_right.x - r.top_left.x;
  const int h = r.bottom_right.y - r.top_left.y;
  return w * h;  // 兩個負數相乘會得到「看起來合理」的正數
}

bool rect_contains(const Rect& r, Point p) {
  return p.x > r.top_left.x && p.x < r.bottom_right.x
      && p.y > r.top_left.y && p.y < r.bottom_right.y;
}
