// 起始碼：讀取與累加已經寫好了，但「最大值」沒有正確維護。
// 先用腦跑一次「全部是負數」的輸入，看看它會輸出什麼。
#include <iostream>

int main() {
  int n = 0;
  std::cin >> n;

  int sum = 0;
  int count = 0;
  int max = 0;  // ← 這個種子在全部負數時會出錯

  for (int i = 0; i < n; ++i) {
    int x = 0;
    std::cin >> x;
    sum += x;
    ++count;
  }

  std::cout << "sum=" << sum << " count=" << count << " max=" << max << "\n";
  return 0;
}
