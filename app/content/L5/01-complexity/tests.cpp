#include "cf_test.hpp"
#include "submission.hpp"
#include "tasks.hpp"

#include <cstddef>
#include <optional>
#include <utility>
#include <vector>

namespace {

// 會計數的型別：每次比較就 ++ops。用它量複雜度，與機器速度無關。
struct Counted {
  int v;
  static long long ops;

  friend bool operator<(const Counted& a, const Counted& b) {
    ++ops;
    return a.v < b.v;
  }
  friend bool operator>(const Counted& a, const Counted& b) {
    ++ops;
    return a.v > b.v;
  }
  friend bool operator==(const Counted& a, const Counted& b) {
    ++ops;
    return a.v == b.v;
  }
};

long long Counted::ops = 0;

std::vector<Counted> make_counted(std::size_t n, bool with_duplicates) {
  std::vector<Counted> out;
  out.reserve(n);
  for (std::size_t i = 0; i < n; ++i) {
    out.push_back(Counted{with_duplicates ? static_cast<int>(i % (n / 2 + 1))
                                          : static_cast<int>(i)});
  }
  return out;
}

}  // namespace

CF_TEST("count_duplicates：基本正確性") {
  const std::vector<int> v{1, 2, 2, 3, 3, 3};
  CF_EXPECT_EQ(count_duplicates(v), static_cast<std::size_t>(2));
}

CF_TEST("count_duplicates：全不重複 / 全相同") {
  const std::vector<int> distinct{1, 2, 3, 4};
  const std::vector<int> same{7, 7, 7, 7};
  CF_EXPECT_EQ(count_duplicates(distinct), static_cast<std::size_t>(0));
  CF_EXPECT_EQ(count_duplicates(same), static_cast<std::size_t>(1));
}

CF_TEST("count_duplicates：空與單一元素") {
  const std::vector<int> empty;
  const std::vector<int> one{5};
  CF_EXPECT_EQ(count_duplicates(empty), static_cast<std::size_t>(0));
  CF_EXPECT_EQ(count_duplicates(one), static_cast<std::size_t>(0));
}

CF_TEST("count_duplicates：必須是 O(n log n)（比較次數上限）") {
  const std::size_t n = 1000;
  const auto v = make_counted(n, false);
  Counted::ops = 0;
  (void)count_duplicates(v);
  // 20 * n * log2(n) ≈ 200000；O(n log n) 的實作約 10000 次
  const long long limit = 20 * static_cast<long long>(n) * 10;
  CF_EXPECT(Counted::ops <= limit);
}

CF_TEST("top_two：一般情況") {
  const std::vector<int> v{3, 9, 2};
  const auto r = top_two(v);
  CF_EXPECT_EQ(r.has_value(), true);
  CF_EXPECT_EQ(r->first, 9);
  CF_EXPECT_EQ(r->second, 3);
}

CF_TEST("top_two：次大必須嚴格小於最大（重複最大值 → nullopt）") {
  const std::vector<int> v{5, 5};
  CF_EXPECT_EQ(top_two(v).has_value(), false);
}

CF_TEST("top_two：元素不足 → nullopt") {
  const std::vector<int> empty;
  const std::vector<int> one{4};
  CF_EXPECT_EQ(top_two(empty).has_value(), false);
  CF_EXPECT_EQ(top_two(one).has_value(), false);
}

CF_TEST("top_two：最大值在最後、含重複") {
  const std::vector<int> v{1, 3, 3, 2, 8};
  const auto r = top_two(v);
  CF_EXPECT_EQ(r.has_value(), true);
  CF_EXPECT_EQ(r->first, 8);
  CF_EXPECT_EQ(r->second, 3);
}

CF_TEST("top_two：兩個元素") {
  const std::vector<int> v{2, 6};
  const auto r = top_two(v);
  CF_EXPECT_EQ(r.has_value(), true);
  CF_EXPECT_EQ(r->first, 6);
  CF_EXPECT_EQ(r->second, 2);
}

CF_TEST("top_two：必須是 O(n)（不可以用排序）") {
  const std::size_t n = 2000;
  const auto v = make_counted(n, false);
  Counted::ops = 0;
  (void)top_two(v);
  // 6n = 12000；單次走訪約 4000 次，排序約 22000 次
  const long long limit = 6 * static_cast<long long>(n);
  CF_EXPECT(Counted::ops <= limit);
}

int main() { return cf::run_all(); }
