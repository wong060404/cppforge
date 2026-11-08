#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <memory>

class Buffer {
 public:
  // 配置 n 個 int，全部初始化為 0
  explicit Buffer(std::size_t n);

  // 移動：接手別人的資源，並讓來源變成空
  Buffer(Buffer&& other) noexcept;
  Buffer& operator=(Buffer&& other) noexcept;

  // 所有權唯一
  Buffer(const Buffer&) = delete;
  Buffer& operator=(const Buffer&) = delete;

  // i >= size() 時丟 std::out_of_range
  void set(std::size_t i, int v);
  int at(std::size_t i) const;

  std::size_t size() const;
  // 沒有元素時為 true（包含被移走之後）
  bool empty() const;

 private:
  std::unique_ptr<int[]> data_;
  std::size_t size_ = 0;
};
