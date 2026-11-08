// 起始碼：物件能建立、能運作，但它允許「不合法的狀態」存在。
// 提示：建構子沒驗證、increment 沒夾住、add 沒拒絕負數。
#include "tasks.hpp"

#include <stdexcept>

Counter::Counter(int max_value) : value_(0), max_(max_value) {
  // 沒有檢查 max_value 是否為正
}

void Counter::increment() {
  ++value_;  // 超過 max_ 也不管
}

void Counter::add(int n) {
  value_ += n;  // 負數照加，超過上限也不夾
}

int Counter::value() const { return value_; }

int Counter::max_value() const { return max_; }

bool Counter::is_full() const { return value_ == max_; }
