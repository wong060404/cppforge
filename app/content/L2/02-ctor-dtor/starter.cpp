// 起始碼：能建立、能讀寫，但會漏記憶體，而且不做邊界檢查。
// 提示：解構函式是空的、set 與 at 都少了同一個檢查。
#include "tasks.hpp"

#include <stdexcept>

Buffer::Buffer(std::size_t n) : data_(new int[n]()), size_(n) {}

Buffer::~Buffer() {
  // 這裡少了釋放
}

void Buffer::set(std::size_t i, int v) {
  data_[i] = v;
}

int Buffer::at(std::size_t i) const {
  return data_[i];
}

std::size_t Buffer::size() const { return size_; }
