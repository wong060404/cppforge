// 起始碼：三個地方漏了。
// 提示：一個搬了但沒刪、一個把謂詞的語意寫反、一個根本沒做交集。
#include "tasks.hpp"

#include <algorithm>
#include <set>

std::vector<int> unique_sorted(const std::vector<int>& v) {
  std::vector<int> out = v;
  std::sort(out.begin(), out.end());
  const auto new_end = std::unique(out.begin(), out.end());
  (void)new_end;  // 回傳值存了，但沒有拿它去 erase —— size 不會變
  return out;
}

std::size_t remove_all(std::vector<int>& v, int value) {
  // remove_if 的謂詞是「要移除的條件」，不是「要保留的條件」
  v.erase(std::remove_if(v.begin(), v.end(), [value](int x) { return x != value; }),
          v.end());
  return v.size();
}

std::vector<int> intersect_sorted(const std::vector<int>& a, const std::vector<int>& b) {
  (void)b;                  // b 完全沒用到
  const std::set<int> sa(a.begin(), a.end());
  return std::vector<int>(sa.begin(), sa.end());
}
