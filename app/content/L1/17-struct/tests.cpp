#include "cf_test.hpp"
#include "tasks.hpp"

namespace {
const Rect kRect{{0, 0}, {4, 3}};
}

CF_TEST("manhattan：正向距離") {
  CF_EXPECT_EQ(manhattan({0, 0}, {3, 4}), 7);
}

CF_TEST("manhattan：順序不影響結果") {
  CF_EXPECT_EQ(manhattan({3, 4}, {0, 0}), 7);
}

CF_TEST("manhattan：同一點為 0") {
  CF_EXPECT_EQ(manhattan({5, 5}, {5, 5}), 0);
}

CF_TEST("manhattan：含負座標") {
  CF_EXPECT_EQ(manhattan({-2, -3}, {1, 1}), 7);
}

CF_TEST("rect_area：一般矩形") {
  CF_EXPECT_EQ(rect_area(kRect), 12);
}

CF_TEST("rect_area：退化矩形（右下在左上左上方）回傳 0") {
  const Rect bad{{10, 10}, {2, 2}};
  CF_EXPECT_EQ(rect_area(bad), 0);
}

CF_TEST("rect_area：寬度為 0 的退化矩形回傳 0") {
  const Rect flat{{3, 0}, {3, 9}};
  CF_EXPECT_EQ(rect_area(flat), 0);
}

CF_TEST("rect_contains：內部點") {
  CF_EXPECT_EQ(rect_contains(kRect, {2, 1}), true);
}

CF_TEST("rect_contains：四個角都算在內") {
  CF_EXPECT_EQ(rect_contains(kRect, {0, 0}), true);
  CF_EXPECT_EQ(rect_contains(kRect, {4, 0}), true);
  CF_EXPECT_EQ(rect_contains(kRect, {0, 3}), true);
  CF_EXPECT_EQ(rect_contains(kRect, {4, 3}), true);
}

CF_TEST("rect_contains：外部點") {
  CF_EXPECT_EQ(rect_contains(kRect, {5, 1}), false);
  CF_EXPECT_EQ(rect_contains(kRect, {2, 4}), false);
}

int main() { return cf::run_all(); }
