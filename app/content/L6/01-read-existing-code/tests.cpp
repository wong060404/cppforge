#include "cf_test.hpp"
#include "tasks.hpp"

#include <string>
#include <vector>

CF_TEST("summary_line：一般情況（含 0）") {
  const std::vector<int> v{0, 10, 20};
  // stats::compute 的平均只算非零元素 → (10 + 20) / 2 = 15
  CF_EXPECT_EQ(summary_line(v), std::string("n=3 min=0 max=20 mean=15.00"));
}

CF_TEST("summary_line：沒有 0 時平均就是全體平均") {
  const std::vector<int> v{2, 4, 6};
  CF_EXPECT_EQ(summary_line(v), std::string("n=3 min=2 max=6 mean=4.00"));
}

CF_TEST("summary_line：全部為 0 時平均為 0.00") {
  const std::vector<int> v{0, 0, 0};
  CF_EXPECT_EQ(summary_line(v), std::string("n=3 min=0 max=0 mean=0.00"));
}

CF_TEST("summary_line：空輸入回 \"no data\"") {
  const std::vector<int> v;
  CF_EXPECT_EQ(summary_line(v), std::string("no data"));
}

CF_TEST("summary_line：負數也要正確") {
  const std::vector<int> v{-5, 5};
  CF_EXPECT_EQ(summary_line(v), std::string("n=2 min=-5 max=5 mean=0.00"));
}

CF_TEST("above_average_line：一般情況") {
  const std::vector<int> v{0, 10, 20};   // 平均 15（非零）→ 只有 20 超過
  CF_EXPECT_EQ(above_average_line(v), std::string("above=33.3%"));
}

CF_TEST("above_average_line：平均為 0 時回 0.0%") {
  const std::vector<int> v{0, 0};
  CF_EXPECT_EQ(above_average_line(v), std::string("above=0.0%"));
}

CF_TEST("above_average_line：空輸入回 0.0%") {
  const std::vector<int> v;
  CF_EXPECT_EQ(above_average_line(v), std::string("above=0.0%"));
}

CF_TEST("above_average_line：全部超過與全部不超過") {
  const std::vector<int> v{1, 2, 100};   // 平均 (1+2+100)/3 = 34.33...
  CF_EXPECT_EQ(above_average_line(v), std::string("above=33.3%"));
  const std::vector<int> same{5, 5, 5};  // 平均 5，沒有人嚴格大於
  CF_EXPECT_EQ(above_average_line(same), std::string("above=0.0%"));
}

CF_TEST("above_average_line：必須用同事模組的平均（不能用全體平均）") {
  // 全體平均 = 18/4 = 4.5；模組的非零平均 = 18/3 = 6.0
  // 用 6.0 → 只有 7 超過 → 25.0%
  // 用 4.5 → 5、6、7 都超過 → 75.0%
  const std::vector<int> v{0, 5, 6, 7};
  CF_EXPECT_EQ(above_average_line(v), std::string("above=25.0%"));
}

int main() { return cf::run_all(); }
