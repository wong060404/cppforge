#pragma once
// 這個介面不可修改（它是「同事寫好的」模組，你只能讀它、用它）。
#include <cstddef>
#include <optional>
#include <vector>

namespace stats {

// 摘要結果。
// ⚠ 重要語意：mean 是「**非零元素**的平均」，不是全體平均。
//   原因：這個模組原本用於感測器資料，0 代表「這次沒有讀到值」，不該拉低平均。
//   若全部元素都是 0，mean 為 0.0。
//   n / min / max 仍然是針對**全部**元素。
struct Summary {
  std::size_t n;
  int min;
  int max;
  double mean;
};

// 空 vector 回傳 std::nullopt（沒有資料就沒有摘要）。
std::optional<Summary> compute(const std::vector<int>& samples);

}  // namespace stats
