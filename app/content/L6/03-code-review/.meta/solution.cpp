// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <stdexcept>

RingBuffer::RingBuffer(std::size_t capacity) : data_(capacity, 0), head_(0), size_(0) {}

void RingBuffer::push(int value) {
  if (data_.empty()) {
    return;                    // 容量 0：不儲存任何東西
  }
  const std::size_t cap = data_.size();
  if (size_ < cap) {
    // 未滿：放在「目前尾端」= (head_ + size_) % cap
    data_[(head_ + size_) % cap] = value;
    ++size_;
  } else {
    // 已滿：覆寫最舊的元素，並把 head_ 往前推一格
    data_[head_] = value;
    head_ = (head_ + 1) % cap;
  }
}

std::size_t RingBuffer::size() const { return size_; }

std::size_t RingBuffer::capacity() const { return data_.size(); }

int RingBuffer::at(std::size_t i) const {
  if (i >= size_) {
    throw std::out_of_range("RingBuffer::at");
  }
  return data_[(head_ + i) % data_.size()];   // 環繞
}

std::vector<int> RingBuffer::to_vector() const {
  std::vector<int> out;
  out.reserve(size_);
  for (std::size_t i = 0; i < size_; ++i) {
    out.push_back(data_[(head_ + i) % data_.size()]);
  }
  return out;
}
