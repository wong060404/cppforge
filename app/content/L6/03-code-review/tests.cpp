#include "cf_test.hpp"
#include "tasks.hpp"

#include <stdexcept>
#include <vector>

CF_TEST("空緩衝區：size 與 capacity") {
  const RingBuffer b(3);
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(0));
  CF_EXPECT_EQ(b.capacity(), static_cast<std::size_t>(3));
  CF_EXPECT_EQ(b.to_vector().size(), static_cast<std::size_t>(0));
}

CF_TEST("未滿時：追加在尾端，at(0) 是最舊的") {
  RingBuffer b(3);
  b.push(10);
  b.push(20);
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(2));
  CF_EXPECT_EQ(b.at(0), 10);
  CF_EXPECT_EQ(b.at(1), 20);
}

CF_TEST("剛滿：size 等於 capacity") {
  RingBuffer b(2);
  b.push(1);
  b.push(2);
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(2));
  CF_EXPECT_EQ_RANGE(b.to_vector(), (std::vector<int>{1, 2}));
}

CF_TEST("滿了之後：覆寫最舊的，size 不再成長") {
  RingBuffer b(3);
  b.push(1);
  b.push(2);
  b.push(3);
  b.push(4);                 // 覆寫 1
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(3));
  CF_EXPECT_EQ_RANGE(b.to_vector(), (std::vector<int>{2, 3, 4}));
  CF_EXPECT_EQ(b.at(0), 2);
  CF_EXPECT_EQ(b.at(2), 4);
}

CF_TEST("連續覆寫一整圈") {
  RingBuffer b(2);
  b.push(1);
  b.push(2);
  b.push(3);                 // {2,3}
  b.push(4);                 // {3,4}
  CF_EXPECT_EQ_RANGE(b.to_vector(), (std::vector<int>{3, 4}));
  b.push(5);                 // {4,5}
  CF_EXPECT_EQ_RANGE(b.to_vector(), (std::vector<int>{4, 5}));
}

CF_TEST("容量 1 的邊界") {
  RingBuffer b(1);
  b.push(7);
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(1));
  CF_EXPECT_EQ(b.at(0), 7);
  b.push(8);
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(1));
  CF_EXPECT_EQ(b.at(0), 8);
  CF_EXPECT_EQ_RANGE(b.to_vector(), (std::vector<int>{8}));
}

CF_TEST("at：越界丟 out_of_range") {
  RingBuffer b(2);
  b.push(1);
  CF_EXPECT_THROW(b.at(1), std::out_of_range);
  CF_EXPECT_THROW(b.at(99), std::out_of_range);
}

CF_TEST("at 與 to_vector 對應一致") {
  RingBuffer b(3);
  for (int i = 1; i <= 7; ++i) b.push(i);
  const auto v = b.to_vector();
  CF_EXPECT_EQ(v.size(), static_cast<std::size_t>(3));
  for (std::size_t i = 0; i < v.size(); ++i) {
    CF_EXPECT_EQ(v[i], b.at(i));
  }
  // 最後 push 的是 7，最舊的是 5
  CF_EXPECT_EQ(v.front(), 5);
  CF_EXPECT_EQ(v.back(), 7);
}

CF_TEST("大量 push 之後仍然正確") {
  RingBuffer b(5);
  for (int i = 0; i < 105; ++i) b.push(i);
  CF_EXPECT_EQ(b.size(), static_cast<std::size_t>(5));
  CF_EXPECT_EQ_RANGE(b.to_vector(), (std::vector<int>{100, 101, 102, 103, 104}));
}

int main() { return cf::run_all(); }
