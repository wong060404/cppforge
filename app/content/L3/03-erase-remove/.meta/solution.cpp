// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <algorithm>
#include <iterator>
#include <set>

std::vector<int> unique_sorted(const std::vector<int>& v) {
  std::vector<int> out = v;
  std::sort(out.begin(), out.end());                       // ① 先排序
  out.erase(std::unique(out.begin(), out.end()), out.end());  // ② 搬 + 真刪
  return out;
}

std::size_t remove_all(std::vector<int>& v, int value) {
  // 謂詞是「要移除的條件」：等於 value 就移除
  v.erase(std::remove_if(v.begin(), v.end(), [value](int x) { return x == value; }),
          v.end());
  return v.size();
}

std::vector<int> intersect_sorted(const std::vector<int>& a, const std::vector<int>& b) {
  const std::set<int> sa(a.begin(), a.end());   // set 自動排序 + 去重
  const std::set<int> sb(b.begin(), b.end());
  std::vector<int> out;
  std::set_intersection(sa.begin(), sa.end(), sb.begin(), sb.end(), std::back_inserter(out));
  return out;
}
