// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <cmath>

Vec2::Vec2(int x, int y) : x_(x), y_(y) {}

int Vec2::x() const { return x_; }

int Vec2::y() const { return y_; }

Vec2& Vec2::operator+=(const Vec2& other) {
  x_ += other.x_;
  y_ += other.y_;      // 兩個軸都要更新
  return *this;        // 回傳自己，才能鏈式運算
}

bool Vec2::operator==(const Vec2& other) const {
  return x_ == other.x_ && y_ == other.y_;   // 兩個軸都要比
}

double Vec2::length() const {
  const double sum = static_cast<double>(x_) * x_ + static_cast<double>(y_) * y_;
  return std::sqrt(sum);
}

std::ostream& operator<<(std::ostream& os, const Vec2& v) {
  // 格式就是介面：一旦決定，測試與日誌都會依賴它
  return os << "(" << v.x() << ", " << v.y() << ")";
}
