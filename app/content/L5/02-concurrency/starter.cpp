// 起始碼：三個地方漏了，而且都是「小資料看不出來」的錯。
// 提示：分段時掉了餘數、計數器沒有用 atomic、每段少填最後一個。
#include "tasks.hpp"

#include <algorithm>
#include <thread>

long long parallel_sum(const std::vector<int>& v, unsigned k) {
  if (v.empty()) {
    return 0;
  }
  const std::size_t n = v.size();
  const std::size_t workers = std::min<std::size_t>(k == 0 ? 1 : k, n);
  const std::size_t chunk = n / workers;   // 整除，餘數被丟掉

  std::vector<long long> partial(workers, 0);
  std::vector<std::thread> threads;
  threads.reserve(workers);
  std::size_t begin = 0;
  for (std::size_t t = 0; t < workers; ++t) {
    const std::size_t end = begin + chunk;
    threads.emplace_back([&v, &partial, t, begin, end] {
      long long s = 0;
      for (std::size_t i = begin; i < end; ++i) {
        s += v[i];
      }
      partial[t] = s;
    });
    begin += chunk;
  }
  for (auto& th : threads) {
    th.join();
  }
  long long total = 0;
  for (long long p : partial) {
    total += p;
  }
  return total;
}

std::size_t parallel_count(const std::vector<int>& v,
                           const std::function<bool(int)>& pred, unsigned k) {
  if (v.empty()) {
    return 0;
  }
  const std::size_t n = v.size();
  const std::size_t workers = std::min<std::size_t>(k == 0 ? 1 : k, n);
  const std::size_t chunk = n / workers;
  const std::size_t rem = n % workers;

  std::size_t count = 0;   // 一般的整數：多執行緒同時 ++ 是資料競爭
  std::vector<std::thread> threads;
  threads.reserve(workers);
  std::size_t begin = 0;
  for (std::size_t t = 0; t < workers; ++t) {
    const std::size_t len = chunk + (t < rem ? 1 : 0);
    const std::size_t end = begin + len;
    threads.emplace_back([&v, &pred, &count, begin, end] {
      for (std::size_t i = begin; i < end; ++i) {
        if (pred(v[i])) {
          ++count;
        }
      }
    });
    begin = end;
  }
  for (auto& th : threads) {
    th.join();
  }
  return count;
}

std::vector<long long> parallel_fill(std::size_t n, unsigned k) {
  std::vector<long long> out(n, 0);
  if (n == 0) {
    return out;
  }
  const std::size_t workers = std::min<std::size_t>(k == 0 ? 1 : k, n);
  const std::size_t chunk = n / workers;
  const std::size_t rem = n % workers;

  std::vector<std::thread> threads;
  threads.reserve(workers);
  std::size_t begin = 0;
  for (std::size_t t = 0; t < workers; ++t) {
    const std::size_t len = chunk + (t < rem ? 1 : 0);
    const std::size_t end = begin + len;
    threads.emplace_back([&out, begin, end] {
      for (std::size_t i = begin; i + 1 < end; ++i) {   // 少了最後一個
        out[i] = static_cast<long long>(i) * 2;
      }
    });
    begin = end;
  }
  for (auto& th : threads) {
    th.join();
  }
  return out;
}
