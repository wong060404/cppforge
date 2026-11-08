#pragma once
// 這個介面不可修改：你只能實作它。
#include <memory>
#include <string>
#include <vector>

class Shape {
 public:
  // 基底類別的解構函式必須是 virtual：否則透過 Shape* delete 時
  // 衍生類別的解構函式不會被呼叫，衍生類別持有的資源就會洩漏。
  virtual ~Shape() = default;

  virtual std::string name() const = 0;   // 純虛擬
  virtual double area() const = 0;        // 純虛擬
};

class Circle : public Shape {
 public:
  explicit Circle(double radius);
  std::string name() const override;
  double area() const override;

 private:
  double radius_;
};

class Rect : public Shape {
 public:
  Rect(double width, double height);
  std::string name() const override;
  double area() const override;

 private:
  double width_;
  double height_;
};

// 所有圖形的面積總和；nullptr 元素要略過
double total_area(const std::vector<std::unique_ptr<Shape>>& shapes);

// kind == "circle" → Circle(a)
// kind == "rect"   → Rect(a, b)
// 其他              → nullptr
std::unique_ptr<Shape> make_shape(const std::string& kind, double a, double b);
