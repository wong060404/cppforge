// 參考解（內容 CI 用；學員端不可見）
#include <algorithm>
#include <iostream>
#include <map>
#include <string>
#include <vector>

namespace {

struct Row {
  std::string name;
  long long qty = 0;
  long long amount = 0;
};

}  // namespace

int main() {
  std::ios::sync_with_stdio(false);

  std::size_t n = 0;
  if (!(std::cin >> n)) {
    std::cout << "TOTAL 0\n";
    return 0;
  }

  // ① 聚合：map 的「找不到就建立」語意剛好適合分組
  std::map<std::string, Row> by_name;
  for (std::size_t i = 0; i < n; ++i) {
    std::string name;
    long long qty = 0;
    long long price = 0;
    if (!(std::cin >> name >> qty >> price)) {
      break;
    }
    Row& r = by_name[name];
    r.name = name;
    r.qty += qty;
    r.amount += qty * price;
  }

  std::vector<Row> rows;
  rows.reserve(by_name.size());
  for (const auto& [key, row] : by_name) {
    (void)key;
    rows.push_back(row);
  }

  // ② 排序：金額由大到小，同金額按名稱字典序（嚴格弱序，不用 >=）
  std::sort(rows.begin(), rows.end(), [](const Row& a, const Row& b) {
    if (a.amount != b.amount) {
      return a.amount > b.amount;
    }
    return a.name < b.name;
  });

  // ③ 輸出
  long long total = 0;
  for (const Row& r : rows) {
    std::cout << r.name << ' ' << r.qty << ' ' << r.amount << '\n';
    total += r.amount;
  }
  std::cout << "TOTAL " << total << '\n';
  return 0;
}
