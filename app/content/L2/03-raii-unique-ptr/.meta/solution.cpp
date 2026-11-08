// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <stdexcept>
#include <utility>

Buffer::Buffer(std::size_t n) : data_(std::make_unique<int[]>(n)), size_(n) {}

Buffer::Buffer(Buffer&& other) noexcept
    : data_(std::move(other.data_)), size_(other.size_) {
  other.size_ = 0;   // 來源物件必須明確變成「空」
}

Buffer& Buffer::operator=(Buffer&& other) noexcept {
  if (this != &other) {          // 自我移動賦值要安全
    data_ = std::move(other.data_);
    size_ = other.size_;
    other.size_ = 0;
  }
  return *this;
}

void Buffer::set(std::size_t i, int v) {
  if (i >= size_) {
    throw std::out_of_range("Buffer::set: index out of range");
  }
  data_[i] = v;
}

int Buffer::at(std::size_t i) const {
  if (i >= size_) {
    throw std::out_of_range("Buffer::at: index out of range");
  }
  return data_[i];
}

std::size_t Buffer::size() const { return size_; }

bool Buffer::empty() const { return size_ == 0; }
