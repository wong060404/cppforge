#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>

class IntArray {
 public:
  // n 個 int，全部初始化為 0
  explicit IntArray(std::size_t n);

  // 深拷貝：兩邊各自擁有自己的記憶體
  IntArray(const IntArray& other);

  // 深拷貝，且必須：自我賦值安全、不洩漏舊資料
  IntArray& operator=(const IntArray& other);

  ~IntArray();

  // i >= size() 時丟 std::out_of_range
  void set(std::size_t i, int v);
  int at(std::size_t i) const;

  std::size_t size() const;

 private:
  int* data_;
  std::size_t size_;
};
