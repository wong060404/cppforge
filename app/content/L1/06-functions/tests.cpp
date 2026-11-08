#include "cf_test.hpp"
#include "tasks.hpp"

#include <string>
#include <vector>

CF_TEST("divmod：把商與餘數寫進參考參數") {
  int q = -1;
  int r = -1;
  divmod(17, 5, q, r);
  CF_EXPECT_EQ(q, 3);
  CF_EXPECT_EQ(r, 2);
}

CF_TEST("divmod：整除時餘數為 0") {
  int q = 0;
  int r = 0;
  divmod(20, 4, q, r);
  CF_EXPECT_EQ(q, 5);
  CF_EXPECT_EQ(r, 0);
}

CF_TEST("divmod：被除數小於除數") {
  int q = 0;
  int r = 0;
  divmod(2, 7, q, r);
  CF_EXPECT_EQ(q, 0);
  CF_EXPECT_EQ(r, 2);
}

CF_TEST("repeat：重複指定次數") {
  CF_EXPECT_EQ(repeat("ab", 3), std::string("ababab"));
  CF_EXPECT_EQ(repeat("x", 1), std::string("x"));
}

CF_TEST("repeat：0 次或負數次回傳空字串") {
  CF_EXPECT_EQ(repeat("ab", 0), std::string(""));
  CF_EXPECT_EQ(repeat("ab", -5), std::string(""));
}

CF_TEST("repeat：原字串不受影響（是 const 參考）") {
  const std::string s = "hi";
  (void)repeat(s, 3);
  CF_EXPECT_EQ(s, std::string("hi"));
}

CF_TEST("scale_in_place：就地修改每個元素") {
  std::vector<int> v{1, 2, 3};
  scale_in_place(v, 3);
  CF_EXPECT_EQ_RANGE(v, (std::vector<int>{3, 6, 9}));
}

CF_TEST("scale_in_place：factor 為 0 與負數") {
  std::vector<int> v{1, -2, 3};
  scale_in_place(v, 0);
  CF_EXPECT_EQ_RANGE(v, (std::vector<int>{0, 0, 0}));

  std::vector<int> w{1, -2, 3};
  scale_in_place(w, -1);
  CF_EXPECT_EQ_RANGE(w, (std::vector<int>{-1, 2, -3}));
}

CF_TEST("scale_in_place：空 vector 不出錯") {
  std::vector<int> v;
  scale_in_place(v, 5);
  CF_EXPECT_EQ(v.size(), static_cast<std::size_t>(0));
}

int main() { return cf::run_all(); }
