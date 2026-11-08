// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

int midpoint(int a, int b) {
  // 先加寬到 64 位再運算，最後才轉回來 —— 任何 int 組合都不會溢位
  const long long sum = static_cast<long long>(a) + static_cast<long long>(b);
  return static_cast<int>(sum / 2);
}

std::optional<int> safe_at(const std::vector<int>& v, std::size_t i) {
  if (i >= v.size()) {
    return std::nullopt;   // 越界是「沒有值」，不是錯誤
  }
  return v[i];
}

unsigned char clamp_byte(int x) {
  if (x < 0) {
    return 0;
  }
  if (x > 255) {
    return 255;
  }
  return static_cast<unsigned char>(x);   // 此時保證在 [0, 255] 內
}

int first_of(std::size_t n) {
  if (n == 0) {
    return 0;
  }
  int* p = new int[n];
  for (std::size_t i = 0; i < n; ++i) {
    p[i] = 42;
  }
  const int value = p[0];
  delete[] p;          // 誰配置、誰釋放
  return value;
}
