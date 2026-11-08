// 起始碼：三個運算子各少了一半。
// 提示：一個只更新了一軸、一個只比了一軸、一個輸出格式不對。
// （length() 是對的 —— 不是每個函式都一定有錯。）
#include "tasks.hpp"

#include <cmath>

Vec2::Vec2(int x, int y) : x_(x), y_(y) {}

int Vec2::x() const { return x_; }

int Vec2::y() const { return y_; }

Vec2& Vec2::operator+=(const Vec2& other) {
  x_ += other.x();  // y 沒有一起加
  return *this;
}

bool Vec2::operator==(const Vec2& other) const {
  return x_ == other.x();  // y 沒有一起比
}

double Vec2::length() const {
  const double sum = static_cast<double>(x_) * x_ + static_cast<double>(y_) * y_;
  return std::sqrt(sum);
}

std::ostream& operator<<(std::ostream& os, const Vec2& v) {
  return os << v.x() << " " << v.y();  // 少了括號與逗號
}
