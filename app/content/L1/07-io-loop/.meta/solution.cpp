// 參考解（內容 CI 用；學員端不可見）
#include <iostream>

int main() {
  int n = 0;
  if (!(std::cin >> n) || n <= 0) {
    std::cout << "sum=0 count=0 max=0\n";
    return 0;
  }

  int sum = 0;
  int count = 0;
  int max = 0;

  for (int i = 0; i < n; ++i) {
    int x = 0;
    std::cin >> x;
    sum += x;
    ++count;
    // 用第一筆當種子：i == 0 時無條件設定，之後才比較
    if (i == 0 || x > max) {
      max = x;
    }
  }

  std::cout << "sum=" << sum << " count=" << count << " max=" << max << "\n";
  return 0;
}
