#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <vector>

// 固定容量的環形緩衝區。
// 語意：
//   - 未滿時 push 追加在尾端
//   - 已滿時 push **覆寫最舊的元素**
//   - at(0) 是最舊的元素，at(size()-1) 是最新的
//   - size() 最多等於 capacity()
class RingBuffer {
 public:
  explicit RingBuffer(std::size_t capacity);

  void push(int value);

  std::size_t size() const;
  std::size_t capacity() const;

  // i >= size() 時丟 std::out_of_range
  int at(std::size_t i) const;

  // 由舊到新的內容
  std::vector<int> to_vector() const;

 private:
  std::vector<int> data_;
  std::size_t head_ = 0;   // 最舊元素在 data_ 的位置
  std::size_t size_ = 0;
};
