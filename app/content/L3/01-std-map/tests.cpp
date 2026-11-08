#include "cf_test.hpp"
#include "tasks.hpp"

#include <map>
#include <string>
#include <vector>

namespace {
std::map<std::string, int> sample() { return {{"a", 2}, {"b", 5}, {"c", 0}}; }
}

CF_TEST("count_of：回傳真正的次數，不是 0/1") {
  const auto m = sample();
  CF_EXPECT_EQ(count_of(m, "a"), 2);
  CF_EXPECT_EQ(count_of(m, "b"), 5);
}

CF_TEST("count_of：不存在的 key 回傳 0") {
  const auto m = sample();
  CF_EXPECT_EQ(count_of(m, "zzz"), 0);
}

CF_TEST("count_of：查詢不能改變 map 的大小") {
  auto m = sample();
  const std::size_t before = m.size();
  (void)count_of(m, "zzz");
  CF_EXPECT_EQ(m.size(), before);
}

CF_TEST("bump：新 key 從 1 開始") {
  std::map<std::string, int> m;
  bump(m, "x");
  CF_EXPECT_EQ(count_of(m, "x"), 1);
  CF_EXPECT_EQ(m.size(), static_cast<std::size_t>(1));
}

CF_TEST("bump：已存在的 key 要累加") {
  std::map<std::string, int> m{{"x", 2}};
  bump(m, "x");
  CF_EXPECT_EQ(count_of(m, "x"), 3);
  CF_EXPECT_EQ(m.size(), static_cast<std::size_t>(1));
}

CF_TEST("bump：連續三次") {
  std::map<std::string, int> m;
  bump(m, "w");
  bump(m, "w");
  bump(m, "w");
  CF_EXPECT_EQ(count_of(m, "w"), 3);
}

CF_TEST("keys_in_order：回傳 key 而不是 value") {
  const auto m = sample();
  CF_EXPECT_EQ_RANGE(keys_in_order(m), (std::vector<std::string>{"a", "b", "c"}));
}

CF_TEST("keys_in_order：順序是 key 的字典序，不是插入順序") {
  std::map<std::string, int> m;
  m["zebra"] = 1;
  m["apple"] = 2;
  m["mango"] = 3;
  CF_EXPECT_EQ_RANGE(keys_in_order(m), (std::vector<std::string>{"apple", "mango", "zebra"}));
}

CF_TEST("keys_in_order：空 map 回傳空 vector") {
  const std::map<std::string, int> m;
  CF_EXPECT_EQ(keys_in_order(m).size(), static_cast<std::size_t>(0));
}
CF_TEST("most_common：取次數最多者") {
  const auto m = sample();
  CF_EXPECT_EQ(most_common(m), std::string("b"));
}

CF_TEST("most_common：空 map 回傳空字串") {
  const std::map<std::string, int> m;
  CF_EXPECT_EQ(most_common(m), std::string(""));
}

CF_TEST("most_common：並列時取字典序最小") {
  const std::map<std::string, int> m{{"beta", 3}, {"alpha", 3}};
  CF_EXPECT_EQ(most_common(m), std::string("alpha"));
}

int main() { return cf::run_all(); }
