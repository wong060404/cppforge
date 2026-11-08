#include "cf_test.hpp"
#include "tasks.hpp"

#include <memory>
#include <numbers>
#include <string>
#include <vector>

CF_TEST("Circle：名稱與面積") {
  const Circle c(2.0);
  CF_EXPECT_EQ(c.name(), std::string("circle"));
  CF_EXPECT_NEAR(c.area(), std::numbers::pi * 4.0, 1e-9);
}

CF_TEST("Rect：名稱與面積") {
  const Rect r(3.0, 4.0);
  CF_EXPECT_EQ(r.name(), std::string("rect"));
  CF_EXPECT_NEAR(r.area(), 12.0, 1e-9);
}

CF_TEST("透過基底參考呼叫：會分派到衍生類別的實作") {
  const Circle c(1.0);
  const Rect r(2.0, 2.0);
  const Shape& s1 = c;
  const Shape& s2 = r;
  CF_EXPECT_EQ(s1.name(), std::string("circle"));
  CF_EXPECT_EQ(s2.name(), std::string("rect"));
  CF_EXPECT_NEAR(s1.area(), std::numbers::pi, 1e-9);
  CF_EXPECT_NEAR(s2.area(), 4.0, 1e-9);
}

CF_TEST("total_area：混合不同型別在同一個容器") {
  std::vector<std::unique_ptr<Shape>> shapes;
  shapes.push_back(std::make_unique<Circle>(2.0));
  shapes.push_back(std::make_unique<Rect>(3.0, 4.0));
  CF_EXPECT_NEAR(total_area(shapes), std::numbers::pi * 4.0 + 12.0, 1e-9);
}

CF_TEST("total_area：略過 nullptr 元素") {
  std::vector<std::unique_ptr<Shape>> shapes;
  shapes.push_back(std::make_unique<Rect>(2.0, 3.0));
  shapes.push_back(nullptr);
  shapes.push_back(std::make_unique<Rect>(1.0, 1.0));
  CF_EXPECT_NEAR(total_area(shapes), 7.0, 1e-9);
}

CF_TEST("total_area：空容器為 0") {
  const std::vector<std::unique_ptr<Shape>> shapes;
  CF_EXPECT_NEAR(total_area(shapes), 0.0, 1e-9);
}

CF_TEST("make_shape(circle)：回傳圓形") {
  const auto p = make_shape("circle", 2.0, 0.0);
  CF_EXPECT(p != nullptr);
  if (p) {
    CF_EXPECT_EQ(p->name(), std::string("circle"));
    CF_EXPECT_NEAR(p->area(), std::numbers::pi * 4.0, 1e-9);
  }
}

CF_TEST("make_shape(rect)：回傳矩形（要用到第二個參數）") {
  const auto p = make_shape("rect", 3.0, 4.0);
  CF_EXPECT(p != nullptr);
  if (p) {
    CF_EXPECT_EQ(p->name(), std::string("rect"));
    CF_EXPECT_NEAR(p->area(), 12.0, 1e-9);
  }
}

CF_TEST("make_shape：未知種類回傳 nullptr") {
  CF_EXPECT(make_shape("blob", 1.0, 1.0) == nullptr);
}

CF_TEST("邊界：半徑 0 或寬度 0，面積就是 0") {
  const Circle c(0.0);
  const Rect r(0.0, 5.0);
  CF_EXPECT_NEAR(c.area(), 0.0, 1e-12);
  CF_EXPECT_NEAR(r.area(), 0.0, 1e-12);
  CF_EXPECT_EQ(c.name(), std::string("circle"));
}

CF_TEST("多型容器解構不洩漏（基底解構函式是 virtual）") {
  {
    std::vector<std::unique_ptr<Shape>> shapes;
    for (int i = 0; i < 20; ++i) {
      shapes.push_back(make_shape(i % 2 == 0 ? "circle" : "rect", 1.0 + i, 2.0));
    }
    CF_EXPECT_NEAR(total_area(shapes), total_area(shapes), 1e-12);
  }
  CF_EXPECT(true);
}

int main() { return cf::run_all(); }
