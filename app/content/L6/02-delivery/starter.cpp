// 起始碼：能跑、能輸出，但三個地方不符合交付規格。
// 提示：同名沒有合併、排序方向相反、金額用 int 會溢位。
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

namespace {

struct Row {
  std::string name;
  int qty;
  int amount;   // 金額用 int：大數會溢位（有號溢位是 UB）
};

}  // namespace

int main() {
  std::ios::sync_with_stdio(false);

  std::size_t n = 0;
  if (!(std::cin >> n)) {
    std::cout << "TOTAL 0\n";
    return 0;
  }

  std::vector<Row> rows;
  rows.reserve(n);
  for (std::size_t i = 0; i < n; ++i) {
    std::string name;
    int qty = 0;
    int price = 0;
    if (!(std::cin >> name >> qty >> price)) {
      break;
    }
    // 沒有合併同名項目：每一筆都變成獨立的一行
    rows.push_back(Row{name, qty, qty * price});
  }

  // 排序方向相反（由小到大）
  std::sort(rows.begin(), rows.end(), [](const Row& a, const Row& b) {
    return a.amount < b.amount;
  });

  int total = 0;
  for (const Row& r : rows) {
    std::cout << r.name << ' ' << r.qty << ' ' << r.amount << '\n';
    total += r.amount;
  }
  std::cout << "TOTAL " << total << '\n';
  return 0;
}
