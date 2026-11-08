#include "cf_test.hpp"
#include "tasks.hpp"

#include <stdexcept>
#include <string>

// ── ① optional 契約：絕不拋例外 ──────────────────────────────────
CF_TEST("opt：正常值") {
  CF_EXPECT_EQ(to_int_opt("42").value_or(-1), 42);
}

CF_TEST("opt：負數與正號") {
  CF_EXPECT_EQ(to_int_opt("-7").value_or(-1), -7);
  CF_EXPECT_EQ(to_int_opt("+5").value_or(-1), 5);
}

CF_TEST("opt：空字串要回 nullopt（不可拋例外）") {
  CF_EXPECT_EQ(to_int_opt("").has_value(), false);
}

CF_TEST("opt：多餘字元要算失敗") {
  CF_EXPECT_EQ(to_int_opt("12x").has_value(), false);
  CF_EXPECT_EQ(to_int_opt(" 5").has_value(), false);
  CF_EXPECT_EQ(to_int_opt("5 ").has_value(), false);
}

CF_TEST("opt：溢位要算失敗（不可拋例外）") {
  CF_EXPECT_EQ(to_int_opt("99999999999").has_value(), false);
}

// ── ② 例外契約：失敗必須丟 invalid_argument ──────────────────────
CF_TEST("throw：正常值不丟例外") {
  CF_EXPECT_EQ(to_int_or_throw("42"), 42);
  CF_EXPECT_EQ(to_int_or_throw("-7"), -7);
}

CF_TEST("throw：空字串丟 invalid_argument") {
  CF_EXPECT_THROW(to_int_or_throw(""), std::invalid_argument);
}

CF_TEST("throw：多餘字元丟 invalid_argument") {
  CF_EXPECT_THROW(to_int_or_throw("12x"), std::invalid_argument);
}

CF_TEST("throw：溢位丟 invalid_argument（不是 out_of_range）") {
  CF_EXPECT_THROW(to_int_or_throw("99999999999"), std::invalid_argument);
}

// ── ③ 錯誤碼契約：絕不拋，靠 ok 表達 ─────────────────────────────
CF_TEST("outcome：成功時 ok 且值正確") {
  const auto r = to_int_outcome("42");
  CF_EXPECT_EQ(r.ok, true);
  CF_EXPECT_EQ(r.value, 42);
}

CF_TEST("outcome：失敗時 ok == false（不可拋例外）") {
  CF_EXPECT_EQ(to_int_outcome("").ok, false);
  CF_EXPECT_EQ(to_int_outcome("12x").ok, false);
  CF_EXPECT_EQ(to_int_outcome("99999999999").ok, false);
}

CF_TEST("outcome：只有正負號也算失敗") {
  CF_EXPECT_EQ(to_int_outcome("+").ok, false);
  CF_EXPECT_EQ(to_int_outcome("-").ok, false);
}

int main() { return cf::run_all(); }
