// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

namespace {
int abs_int(int v) { return v < 0 ? -v : v; }
}

int manhattan(Point a, Point b) {
  return abs_int(a.x - b.x) + abs_int(a.y - b.y);
}

int rect_area(const Rect& r) {
  // 先擋退化輸入，主邏輯就不用想邊界
  if (r.bottom_right.x < r.top_left.x || r.bottom_right.y < r.top_left.y) {
    return 0;
  }
  const int w = r.bottom_right.x - r.top_left.x;
  const int h = r.bottom_right.y - r.top_left.y;
  return w * h;
}

bool rect_contains(const Rect& r, Point p) {
  return p.x >= r.top_left.x && p.x <= r.bottom_right.x
      && p.y >= r.top_left.y && p.y <= r.bottom_right.y;
}
