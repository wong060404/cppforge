#include "cf_test.hpp"
#include "tasks.hpp"

#include <stdexcept>
#include <utility>

CF_TEST("離開 scope 時執行一次") {
  int runs = 0;
  {
    ScopeGuard g([&runs] { ++runs; });
    CF_EXPECT_EQ(runs, 0);
  }
  CF_EXPECT_EQ(runs, 1);
}

CF_TEST("建構後 active() 為 true") {
  ScopeGuard g([] {});
  CF_EXPECT_EQ(g.active(), true);
}

CF_TEST("release() 之後不再執行") {
  int runs = 0;
  {
    ScopeGuard g([&runs] { ++runs; });
    g.release();
    CF_EXPECT_EQ(g.active(), false);
  }
  CF_EXPECT_EQ(runs, 0);
}

CF_TEST("提早 return 也會執行（這是 guard 的價值）") {
  int runs = 0;
  auto f = [&runs](bool early) {
    ScopeGuard g([&runs] { ++runs; });
    if (early) {
      return 1;
    }
    return 2;
  };
  CF_EXPECT_EQ(f(true), 1);
  CF_EXPECT_EQ(f(false), 2);
  CF_EXPECT_EQ(runs, 2);
}

CF_TEST("拋出例外時仍然執行（stack unwinding）") {
  int runs = 0;
  try {
    ScopeGuard g([&runs] { ++runs; });
    throw std::runtime_error("boom");
  } catch (const std::runtime_error&) {
  }
  CF_EXPECT_EQ(runs, 1);
}

CF_TEST("移動之後只執行一次（來源變成非作用中）") {
  int runs = 0;
  {
    ScopeGuard a([&runs] { ++runs; });
    ScopeGuard b(std::move(a));
    CF_EXPECT_EQ(a.active(), false);
    CF_EXPECT_EQ(b.active(), true);
  }
  CF_EXPECT_EQ(runs, 1);
}

CF_TEST("make_guard 回傳的 guard 仍然有效") {
  int runs = 0;
  { auto g = make_guard([&runs] { ++runs; }); }
  CF_EXPECT_EQ(runs, 1);
}

CF_TEST("移動賦值：接手後只執行一次") {
  int inner = 0;
  {
    ScopeGuard a([] {});   // 被覆蓋的空動作（move 賦值不會執行它）
    {
      ScopeGuard b([&inner] { ++inner; });
      a = std::move(b);
      CF_EXPECT_EQ(b.active(), false);
    }
    // b 已被移空 → inner 仍是 0
    CF_EXPECT_EQ(inner, 0);
  }
  // 由 a 執行一次
  CF_EXPECT_EQ(inner, 1);
}

CF_TEST("多個 guard 依反向順序執行") {
  std::string order;
  {
    ScopeGuard g1([&order] { order += '1'; });
    ScopeGuard g2([&order] { order += '2'; });
  }
  CF_EXPECT_EQ(order, std::string("21"));
}

int main() { return cf::run_all(); }
