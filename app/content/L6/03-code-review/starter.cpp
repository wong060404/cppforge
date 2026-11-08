// 「同事的」實作，附上看起來很有說服力的註解。
// 有三個 bug —— 註解沒有說謊，但程式碼沒有照註解做。
#include "tasks.hpp"

#include <stdexcept>

RingBuffer::RingBuffer(std::size_t capacity) : data_(capacity, 0), head_(0), size_(0) {}

void RingBuffer::push(int value) {
  // 註解說「滿了就覆寫最舊的」，實際上是「滿了就什麼都不做」
  if (size_ < data_.size()) {
    data_[size_] = value;
    ++size_;
  }
  // 少了覆寫最舊元素的分支（也沒有推進 head_）
}

std::size_t RingBuffer::size() const { return size_; }

std::size_t RingBuffer::capacity() const { return data_.size(); }

int RingBuffer::at(std::size_t i) const {
  if (i >= size_) {
    throw std::out_of_range("RingBuffer::at");
  }
  return data_[i];   // 少了環繞：(head_ + i) % capacity
}

std::vector<int> RingBuffer::to_vector() const {
  std::vector<int> out;
  out.reserve(size_);
  for (std::size_t i = size_; i > 0; --i) {   // 方向相反：應該由舊到新
    out.push_back(data_[i - 1]);
  }
  return out;
}
