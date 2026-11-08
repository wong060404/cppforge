// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <numbers>

Circle::Circle(double radius) : radius_(radius) {}

std::string Circle::name() const { return "circle"; }

double Circle::area() const {
  return std::numbers::pi * radius_ * radius_;   // 用標準的 π，不要硬寫 3.14
}

Rect::Rect(double width, double height) : width_(width), height_(height) {}

std::string Rect::name() const { return "rect"; }

double Rect::area() const { return width_ * height_; }

double total_area(const std::vector<std::unique_ptr<Shape>>& shapes) {
  double sum = 0.0;
  for (const auto& s : shapes) {
    if (s) {
      sum += s->area();   // 動態分派：實際執行哪個 area 由物件型別決定
    }
  }
  return sum;
}

std::unique_ptr<Shape> make_shape(const std::string& kind, double a, double b) {
  if (kind == "circle") {
    return std::make_unique<Circle>(a);
  }
  if (kind == "rect") {
    return std::make_unique<Rect>(a, b);
  }
  return nullptr;   // 未知種類：明確回傳「沒有」
}
