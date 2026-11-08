// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

int count_of(const std::map<std::string, int>& m, const std::string& word) {
  // find 不會插入、不會拋例外；找不到就是 0
  const auto it = m.find(word);
  if (it == m.end()) {
    return 0;
  }
  return it->second;
}

void bump(std::map<std::string, int>& m, const std::string& word) {
  // operator[] 在不存在時會插入 0，正好就是我們要的「從 1 開始」
  ++m[word];
}

std::vector<std::string> keys_in_order(const std::map<std::string, int>& m) {
  std::vector<std::string> out;
  out.reserve(m.size());
  for (const auto& [key, value] : m) {
    (void)value;
    out.push_back(key);   // 收集 key
  }
  return out;
}

std::string most_common(const std::map<std::string, int>& m) {
  std::string best;
  int best_count = -1;
  for (const auto& [key, value] : m) {
    // 嚴格大於：map 已依 key 排序，並列時自然留下字典序最小者
    if (value > best_count) {
      best_count = value;
      best = key;
    }
  }
  return best;
}
