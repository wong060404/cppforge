// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include "format.hpp"
#include "stats.hpp"

std::string summary_line(const std::vector<int>& samples) {
  const auto s = stats::compute(samples);
  if (!s.has_value()) {
    return "no data";      // 空輸入：模組回 nullopt
  }
  return "n=" + std::to_string(s->n) + " min=" + std::to_string(s->min) +
         " max=" + std::to_string(s->max) + " mean=" + fmt::fixed(s->mean, 2);
}

std::string above_average_line(const std::vector<int>& samples) {
  const auto s = stats::compute(samples);
  if (!s.has_value() || s->mean == 0.0) {
    return "above=0.0%";
  }
  std::size_t above = 0;
  for (int v : samples) {
    if (static_cast<double>(v) > s->mean) {
      ++above;
    }
  }
  return "above=" + fmt::percent(static_cast<double>(above) / static_cast<double>(s->n));
}
