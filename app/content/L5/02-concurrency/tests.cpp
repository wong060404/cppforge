#include "cf_test.hpp"
#include "tasks.hpp"

#include <functional>
#include <vector>

namespace {
std::vector<int> seq(int n) {
  std::vector<int> v;
  v.reserve(static_cast<std::size_t>(n));
  for (int i = 1; i <= n; ++i) v.push_back(i);
  return v;
}
}  // namespace

CF_TEST("parallel_sum：單執行緒等於序列總和") {
  const auto v = seq(10);   // 1..10 = 55
  CF_EXPECT_EQ(parallel_sum(v, 1), 55LL);
}

CF_TEST("parallel_sum：3 個執行緒（會出現餘數）") {
  const auto v = seq(10);   // 10 % 3 == 1，餘數必須被算到
  CF_EXPECT_EQ(parallel_sum(v, 3), 55LL);
}

CF_TEST("parallel_sum：執行緒數多於元素數") {
  const auto v = seq(3);    // 3 個元素、8 條執行緒
  CF_EXPECT_EQ(parallel_sum(v, 8), 6LL);
}

CF_TEST("parallel_sum：空 vector 與 k = 0") {
  const std::vector<int> empty;
  const auto v = seq(5);
  CF_EXPECT_EQ(parallel_sum(empty, 4), 0LL);
  CF_EXPECT_EQ(parallel_sum(v, 0), 15LL);
}

CF_TEST("parallel_sum：結果與 k 無關") {
  const auto v = seq(37);
  const long long a = parallel_sum(v, 1);
  const long long b = parallel_sum(v, 5);
  const long long c = parallel_sum(v, 13);
  CF_EXPECT_EQ(a, b);
  CF_EXPECT_EQ(b, c);
}

CF_TEST("parallel_count：偶數個數（1..10 有 5 個）") {
  const auto v = seq(10);
  const std::function<bool(int)> even = [](int x) { return x % 2 == 0; };
  CF_EXPECT_EQ(parallel_count(v, even, 1), static_cast<std::size_t>(5));
  CF_EXPECT_EQ(parallel_count(v, even, 3), static_cast<std::size_t>(5));
}

CF_TEST("parallel_count：沒有符合的元素") {
  const auto v = seq(10);
  const std::function<bool(int)> none = [](int) { return false; };
  CF_EXPECT_EQ(parallel_count(v, none, 4), static_cast<std::size_t>(0));
}

CF_TEST("parallel_count：空 vector") {
  const std::vector<int> empty;
  const std::function<bool(int)> any = [](int) { return true; };
  CF_EXPECT_EQ(parallel_count(empty, any, 3), static_cast<std::size_t>(0));
}

CF_TEST("parallel_fill：每個元素都要填到") {
  const auto out = parallel_fill(10, 3);
  CF_EXPECT_EQ(out.size(), static_cast<std::size_t>(10));
  for (std::size_t i = 0; i < out.size(); ++i) {
    CF_EXPECT_EQ(out[i], static_cast<long long>(i) * 2);
  }
}

CF_TEST("parallel_fill：空與單一元素") {
  CF_EXPECT_EQ(parallel_fill(0, 4).size(), static_cast<std::size_t>(0));
  const auto one = parallel_fill(1, 4);
  CF_EXPECT_EQ(one.size(), static_cast<std::size_t>(1));
  CF_EXPECT_EQ(one[0], 0LL);
}

int main() { return cf::run_all(); }
