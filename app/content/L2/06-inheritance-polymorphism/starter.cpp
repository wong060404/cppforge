// 起始碼：多型本身沒問題（total_area 是對的），但三個地方漏了。
// 提示：一個把圓周率寫成 3.14、一個名字不符規格、一個工廠不管參數。
#include "tasks.hpp"

#include <cmath>

Circle::Circle(double radius) : radius_(radius) {}

std::string Circle::name() const { return "circle"; }

double Circle::area() const {
  return 3.14 * radius_ * radius_;  // 精度不足
}

Rect::Rect(double width, double height) : width_(width), height_(height) {}

std::string Rect::name() const { return "Rectangle"; }  // 規格是 "rect"

double Rect::area() const { return width_ * height_; }

double total_area(const std::vector<std::unique_ptr<Shape>>& shapes) {
  double sum = 0.0;
  for (const auto& s : shapes) {
    if (s) {
      sum += s->area();  // 這一行就是多型：會分派到正確的實作
    }
  }
  return sum;
}

std::unique_ptr<Shape> make_shape(const std::string& kind, double a, double b) {
  (void)b;
  (void)kind;  // 完全沒看 kind
  return std::make_unique<Circle>(a);
}
