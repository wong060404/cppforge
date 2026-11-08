#include "cf_test.hpp"
#include "tasks.hpp"

CF_TEST("隊友的 rect_area 可以正常連結") {
  CF_EXPECT_EQ(rect_area(3, 4), 12);
}

CF_TEST("隊友的 rect_perimeter 可以正常連結") {
  CF_EXPECT_EQ(rect_perimeter(3, 4), 14);
}

CF_TEST("square_area：邊長 1") {
  CF_EXPECT_EQ(square_area(1), 1);
}

CF_TEST("square_area：邊長 5") {
  CF_EXPECT_EQ(square_area(5), 25);
}

CF_TEST("square_area：邊長 0") {
  CF_EXPECT_EQ(square_area(0), 0);
}

int main() { return cf::run_all(); }
