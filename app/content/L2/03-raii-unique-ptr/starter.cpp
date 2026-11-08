// 起始碼：資源管理已經交給 unique_ptr（所以不會洩漏），
// 但物件「回報的狀態」和「實際狀態」對不起來。
// 提示：一個多算、一個判斷相反、一個忘了把來源歸零。
#include "tasks.hpp"

#include <stdexcept>
#include <utility>

Buffer::Buffer(std::size_t n) : data_(std::make_unique<int[]>(n)), size_(n) {}

Buffer::Buffer(Buffer&& other) noexcept
    : data_(std::move(other.data_)), size_(other.size_) {
  // 少了把 other.size_ 歸零
}

Buffer& Buffer::operator=(Buffer&& other) noexcept {
  data_ = std::move(other.data_);
  size_ = other.size_;
  other.size_ = 0;
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

std::size_t Buffer::size() const { return size_ + 1; }

bool Buffer::empty() const { return size_ > 0; }
