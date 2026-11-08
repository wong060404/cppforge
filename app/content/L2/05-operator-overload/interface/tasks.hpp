#pragma once
// 這個介面不可修改：你只能實作它。
#include <ostream>

class Vec2 {
 public:
  Vec2(int x, int y);

  int x() const;
  int y() const;

  // 兩軸都加上 other，並回傳 *this 的參考（支援鏈式寫法）
  Vec2& operator+=(const Vec2& other);

  // 兩軸都相等才算相等
  bool operator==(const Vec2& other) const;

  // sqrt(x² + y²)
  double length() const;

 private:
  int x_;
  int y_;
};

// 輸出格式必須是 "(x, y)"，例如 "(1, 2)"、(-3, 0)
std::ostream& operator<<(std::ostream& os, const Vec2& v);
