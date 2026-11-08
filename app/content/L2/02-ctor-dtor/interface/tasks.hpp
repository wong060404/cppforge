#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>

class Buffer {
 public:
  // 配置 n 個 int，全部初始化為 0
  explicit Buffer(std::size_t n);

  // 釋放
  ~Buffer();

  // 所有權唯一：複製在介面層就被禁止
  Buffer(const Buffer&) = delete;
  Buffer& operator=(const Buffer&) = delete;

  // i >= size() 時丟 std::out_of_range
  void set(std::size_t i, int v);
  // i >= size() 時丟 std::out_of_range
  int at(std::size_t i) const;

  std::size_t size() const;

 private:
  int* data_;
  std::size_t size_;
};
