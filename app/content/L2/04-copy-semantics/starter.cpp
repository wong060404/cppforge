// 起始碼：兩處「複製」都只做了一半。
// 提示：一個配置了記憶體但沒把內容搬過去；一個覆蓋指標前忘了釋放舊資料
//（第二個錯不會讓任何測試失敗 —— 只有洩漏檢查抓得到）。
#include "tasks.hpp"

#include <algorithm>
#include <stdexcept>

IntArray::IntArray(std::size_t n)
    : data_(n > 0 ? new int[n]() : nullptr), size_(n) {}

IntArray::IntArray(const IntArray& other)
    : data_(other.size_ > 0 ? new int[other.size_]() : nullptr),
      size_(other.size_) {
  // 少了把 other 的內容複製過來
}

IntArray& IntArray::operator=(const IntArray& other) {
  if (this == &other) {
    return *this;
  }
  // 少了 delete[] data_ ——舊緩衝區永遠沒人釋放
  size_ = other.size_;
  data_ = size_ > 0 ? new int[size_]() : nullptr;
  std::copy(other.data_, other.data_ + size_, data_);
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
