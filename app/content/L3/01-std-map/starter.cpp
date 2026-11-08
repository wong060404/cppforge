// 起始碼：三個函式各有一個「用錯 API」的錯。
// 提示：count() 給的是 0/1、insert 不會累加、走訪時拿錯欄位。
#include "tasks.hpp"

int count_of(const std::map<std::string, int>& m, const std::string& word) {
  // count() 回傳「有沒有這個 key」（0 或 1），不是「出現幾次」
  return static_cast<int>(m.count(word));
}

void bump(std::map<std::string, int>& m, const std::string& word) {
  // insert 對已存在的 key 不會做任何事
  m.insert({word, 1});
}

std::vector<std::string> keys_in_order(const std::map<std::string, int>& m) {
  std::vector<std::string> out;
  out.reserve(m.size());
  for (const auto& [key, value] : m) {
    (void)key;
    out.push_back(std::to_string(value));  // 收集到的是 value
  }
  return out;
}

std::string most_common(const std::map<std::string, int>& m) {
  std::string best;
  int best_count = -1;
  for (const auto& [key, value] : m) {
    // 用嚴格大於：map 已依 key 排序，所以並列時會留下字典序最小者
    if (value > best_count) {
      best_count = value;
      best = key;
    }
  }
  return best;
}
