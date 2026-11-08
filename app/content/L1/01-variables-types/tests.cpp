#include "cf_test.hpp"
#include "tasks.hpp"

#include <string>

CF_TEST("average3：要有小數，不能被截斷") {
  CF_EXPECT_NEAR(average3(1, 2, 2), 5.0 / 3.0, 1e-9);
}

CF_TEST("average3：剛好整除") {
  CF_EXPECT_NEAR(average3(1, 2, 3), 2.0, 1e-9);
}

CF_TEST("average3：含負數") {
  CF_EXPECT_NEAR(average3(-1, 0, 1), 0.0, 1e-9);
  CF_EXPECT_NEAR(average3(-3, -2, -1), -2.0, 1e-9);
}

CF_TEST("is_even：偶數為 true") {
  CF_EXPECT_EQ(is_even(4), true);
  CF_EXPECT_EQ(is_even(0), true);
}

CF_TEST("is_even：奇數為 false（負數也要正確）") {
  CF_EXPECT_EQ(is_even(3), false);
  CF_EXPECT_EQ(is_even(-3), false);
  CF_EXPECT_EQ(is_even(-4), true);
}

CF_TEST("describe_sign：正數") {
  CF_EXPECT_EQ(describe_sign(7), std::string("positive"));
  CF_EXPECT_EQ(describe_sign(1), std::string("positive"));
}

CF_TEST("describe_sign：負數") {
  CF_EXPECT_EQ(describe_sign(-1), std::string("negative"));
  CF_EXPECT_EQ(describe_sign(-999), std::string("negative"));
}

CF_TEST("describe_sign：零必須是 zero") {
  CF_EXPECT_EQ(describe_sign(0), std::string("zero"));
}

int main() { return cf::run_all(); }
