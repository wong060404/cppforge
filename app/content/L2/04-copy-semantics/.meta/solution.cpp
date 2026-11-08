// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <algorithm>
#include <stdexcept>

IntArray::IntArray(std::size_t n)
    : data_(n > 0 ? new int[n]() : nullptr), size_(n) {}

IntArray::IntArray(const IntArray& other)
    : data_(other.size_ > 0 ? new int[other.size_]() : nullptr),
      size_(other.size_) {
  // 深拷貝的關鍵：把內容搬過去，而不是只抄指標
  std::copy(other.data_, other.data_ + size_, data_);
}

IntArray& IntArray::operator=(const IntArray& other) {
  if (this == &other) {
    return *this;                       // ① 自我賦值保護
  }
  // ② 先配置新的（若 new 失敗，原物件仍完好）
  int* fresh = other.size_ > 0 ? new int[other.size_]() : nullptr;
  std::copy(other.data_, other.data_ + other.size_, fresh);
  // ③ 再放掉舊的
  delete[] data_;
  data_ = fresh;
  size_ = other.size_;
  return *this;
}

IntArray::~IntArray() {
  delete[] data_;
  data_ = nullptr;
}

void IntArray::set(std::size_t i, int v) {
  if (i >= size_) {
    throw std::out_of_range("IntArray::set");
  }
  data_[i] = v;
}

int IntArray::at(std::size_t i) const {
  if (i >= size_) {
    throw std::out_of_range("IntArray::at");
  }
  return data_[i];
}

std::size_t IntArray::size() const { return size_; }
