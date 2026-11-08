#include "stats.hpp"

#include <algorithm>

namespace stats {

std::optional<Summary> compute(const std::vector<int>& samples) {
  if (samples.empty()) {
    return std::nullopt;
  }
  const auto [lo, hi] = std::minmax_element(samples.begin(), samples.end());

  // 「非零」才算進平均：0 代表這個樣本沒有讀到值
  double sum = 0.0;
  std::size_t counted = 0;
  for (int v : samples) {
    if (v != 0) {
      sum += static_cast<double>(v);
      ++counted;
    }
  }
  const double mean = (counted == 0) ? 0.0 : sum / static_cast<double>(counted);

  return Summary{samples.size(), *lo, *hi, mean};
}

}  // namespace stats
