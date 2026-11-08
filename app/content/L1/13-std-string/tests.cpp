#include "cf_test.hpp"
#include "tasks.hpp"

#include <string>
#include <vector>

CF_TEST("join：三個元素用 '-' 連接") {
  const std::vector<std::string> parts{"a", "b", "c"};
  CF_EXPECT_EQ(join(parts, "-"), std::string("a-b-c"));
}

CF_TEST("join：單一元素不加分隔符") {
  const std::vector<std::string> parts{"only"};
  CF_EXPECT_EQ(join(parts, "--"), std::string("only"));
}

CF_TEST("join：空 vector 回傳空字串") {
  const std::vector<std::string> parts;
  CF_EXPECT_EQ(join(parts, ","), std::string(""));
}

CF_TEST("join：含空字串的元素仍然要分隔") {
  const std::vector<std::string> parts{"a", "", "c"};
  CF_EXPECT_EQ(join(parts, "|"), std::string("a||c"));
}

CF_TEST("count_char：計算出現次數") {
  CF_EXPECT_EQ(count_char("banana", 'a'), static_cast<std::size_t>(3));
}

CF_TEST("count_char：不存在時為 0") {
  CF_EXPECT_EQ(count_char("banana", 'z'), static_cast<std::size_t>(0));
}

CF_TEST("count_char：大小寫敏感") {
  CF_EXPECT_EQ(count_char("AaA", 'A'), static_cast<std::size_t>(2));
}

CF_TEST("trim：移除前後空格") {
  CF_EXPECT_EQ(trim("  hi  "), std::string("hi"));
}

CF_TEST("trim：移除 Tab 與換行（HTTP 標頭常見）") {
  CF_EXPECT_EQ(trim("\t hi \r\n"), std::string("hi"));
}

CF_TEST("trim：全是空白時回傳空字串") {
  CF_EXPECT_EQ(trim(" \t\n "), std::string(""));
}

CF_TEST("trim：不需修剪時原樣回傳") {
  CF_EXPECT_EQ(trim("nochange"), std::string("nochange"));
}

int main() { return cf::run_all(); }
