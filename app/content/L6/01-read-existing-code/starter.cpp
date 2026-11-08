// 起始碼：三個地方沒有讀懂「同事的」模組。
// 提示：一個沒處理「沒有資料」、一個小數位數不符規格、
//       一個自己重算平均（於是把 0 也算進去了）。
#include "tasks.hpp"

#include "format.hpp"
#include "stats.hpp"

std::string summary_line(const std::vector<int>& samples) {
  // value() 在空 optional 上會丟 bad_optional_access —— 沒有處理「沒有資料」
  const stats::Summary s = stats::compute(samples).value();
  return "n=" + std::to_string(s.n) + " min=" + std::to_string(s.min) +
         " max=" + std::to_string(s.max) + " mean=" + fmt::fixed(s.mean, 1);
}

std::string above_average_line(const std::vector<int>& samples) {
  if (samples.empty()) {
    return "above=0.0%";
  }
  double sum = 0.0;
  for (int v : samples) {
    sum += static_cast<double>(v);   // 自己重算：把 0 也算進平均
  }
  const double mean = sum / static_cast<double>(samples.size());
  if (mean == 0.0) {
    return "above=0.0%";
  }
  std::size_t above = 0;
  for (int v : samples) {
    if (static_cast<double>(v) > mean) {
      ++above;
    }
  }
  return "above=" + fmt::percent(static_cast<double>(above) / static_cast<double>(samples.size()));
}
