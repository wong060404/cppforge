# 繼承與多型

多型的問題只有一句話：**為什麼透過 `Shape*` 呼叫 `area()`，會執行到 `Circle::area()`？**

答案不是「因為它繼承了」，而是「因為它被標成 `virtual`」。

## virtual：查表，而不是直接跳

```cpp
class Shape {
 public:
  virtual ~Shape() = default;
  virtual std::string name() const = 0;   // 純虛擬：沒有實作
  virtual double area() const = 0;
};
```

每個有 virtual 函式的物件，內部都多了一個隱藏的指標（vptr）指向自己型別的 **vtable**（函式表）。呼叫 `p->area()` 時：

```
非 virtual：編譯器直接生成「跳到 Shape::area」→ 永遠是基底版本
virtual    ：執行期查 vptr → vtable → 找到「這個物件真正的型別」的 area
```

所以「動態型別」決定行為，而不是指標的靜態型別。這叫**動態分派**（dynamic dispatch）。

## 純虛擬與抽象類別

```cpp
virtual double area() const = 0;   // = 0 表示「我不提供實作」
```

含有純虛擬函式的類別叫**抽象類別**：

```cpp
Shape s;              // 編譯錯誤：抽象類別不能實體化
Shape* p = nullptr;   // 可以：指標沒問題
```

這是好事 —— 它強迫你只能透過介面操作，不會意外建立一個「沒有面積的形狀」。

## 為什麼基底解構函式必須 virtual

```cpp
Shape* p = new Circle(2.0);
delete p;             // 若 ~Shape() 不是 virtual……
```

編譯器只會呼叫 `~Shape()`。`Circle` 的解構函式**不會執行** —— 如果 `Circle` 持有資源（`std::string`、陣列、檔案），那份資源就洩漏了。而且標準說這是**未定義行為**。

```cpp
virtual ~Shape() = default;   // 這一行是必要的，不是裝飾
```

本節的介面已經幫你寫好了。實務上還有一個便利寫法：`~Shape() override = default;`（在衍生類別）。

## 用 `unique_ptr<Shape>` 放進同一個容器

```cpp
std::vector<std::unique_ptr<Shape>> shapes;
shapes.push_back(std::make_unique<Circle>(2.0));
shapes.push_back(std::make_unique<Rect>(3.0, 4.0));
```

- 為什麼不是 `std::vector<Shape>`？**物件切片**：容器只能放固定大小的元素，`Shape` 的部分會被保留、`Circle` 的部分被切掉，virtual 也就失效了。
- 為什麼不是 `std::vector<Shape*>`？裸指標需要有人負責 delete；`unique_ptr` 讓容器解構時自動釋放。

## 你要實作的部分

```cpp
class Circle : public Shape { ... };   // name() = "circle"，area() = π r²
class Rect   : public Shape { ... };   // name() = "rect"，area() = w × h

double total_area(const std::vector<std::unique_ptr<Shape>>& shapes);  // 略過 nullptr
std::unique_ptr<Shape> make_shape(const std::string& kind, double a, double b);
//   "circle" → Circle(a)；"rect" → Rect(a, b)；其他 → nullptr
```

起始碼三個地方漏了：`Circle::area()` 用 3.14 當圓周率（precision 不足）、`Rect::name()` return `"Rectangle"`（規格是 `"rect"`）、`make_shape()` 不管 `kind` 一律 return 圓形。

> `total_area()` 在起始碼裡是**對的**—— 它示範了「polymorphism 在集合上就是這樣用」，
> 也是本節最重要的那一行：`sum += s->area();` 會自動分派到正確的實作。
