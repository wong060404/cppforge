// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <stdexcept>

Counter::Counter(int max_value) : value_(0), max_(max_value) {
  // 建構子是最重要的驗證點：不合法就讓物件根本不存在
  if (max_value <= 0) {
    throw std::invalid_argument("Counter: max_value must be positive");
  }
}

void Counter::increment() {
  if (value_ < max_) {
    ++value_;
  }
}

void Counter::add(int n) {
  if (n < 0) {
    throw std::invalid_argument("Counter: n must not be negative");
  }
  value_ = (n > max_ - value_) ? max_ : value_ + n;   // 夾住，避免溢位
}

int Counter::value() const { return value_; }

int Counter::max_value() const { return max_; }

bool Counter::is_full() const { return value_ == max_; }
