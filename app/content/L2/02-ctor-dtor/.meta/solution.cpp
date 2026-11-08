// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <stdexcept>

Buffer::Buffer(std::size_t n) : data_(new int[n]()), size_(n) {}

Buffer::~Buffer() {
  delete[] data_;   // 建構子取得，解構函式釋放
  data_ = nullptr;  // 防禦性寫法：之後若有人誤用，會是明確的空指標
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
