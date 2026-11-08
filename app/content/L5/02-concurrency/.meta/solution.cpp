// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <algorithm>
#include <atomic>
#include <thread>

namespace {

// 把 n 切成 workers 段，回傳第 t 段的 [begin, end)
struct Slice {
  std::size_t begin;
  std::size_t end;
};

Slice slice_of(std::size_t n, std::size_t workers, std::size_t t) {
  const std::size_t chunk = n / workers;      // 每段至少這麼多
  const std::size_t rem = n % workers;        // 前 rem 段各多一個
  const std::size_t begin = t * chunk + std::min(t, rem);
  const std::size_t len = chunk + (t < rem ? 1 : 0);
  return Slice{begin, begin + len};
}

std::size_t worker_count(std::size_t n, unsigned k) {
  const std::size_t wanted = (k == 0) ? 1 : static_cast<std::size_t>(k);
  return std::min(wanted, n);
}

}  // namespace

long long parallel_sum(const std::vector<int>& v, unsigned k) {
  const std::size_t n = v.size();
  if (n == 0) {
    return 0;
  }
  const std::size_t workers = worker_count(n, k);

  std::vector<long long> partial(workers, 0);   // 每個執行緒只寫自己的位置
  std::vector<std::thread> threads;
  threads.reserve(workers);
  for (std::size_t t = 0; t < workers; ++t) {
    const Slice s = slice_of(n, workers, t);
    threads.emplace_back([&v, &partial, t, s] {
      long long local = 0;
      for (std::size_t i = s.begin; i < s.end; ++i) {
        local += v[i];
      }
      partial[t] = local;
    });
  }
  for (auto& th : threads) {
    th.join();                                   // 一定要 join
  }
  long long total = 0;
  for (long long p : partial) {
    total += p;
  }
  return total;
}

std::size_t parallel_count(const std::vector<int>& v,
                           const std::function<bool(int)>& pred, unsigned k) {
  const std::size_t n = v.size();
  if (n == 0) {
    return 0;
  }
  const std::size_t workers = worker_count(n, k);

  std::atomic<std::size_t> count{0};             // 共享計數器必須是 atomic
  std::vector<std::thread> threads;
  threads.reserve(workers);
  for (std::size_t t = 0; t < workers; ++t) {
    const Slice s = slice_of(n, workers, t);
    threads.emplace_back([&v, &pred, &count, s] {
      for (std::size_t i = s.begin; i < s.end; ++i) {
        if (pred(v[i])) {
          count.fetch_add(1, std::memory_order_relaxed);
        }
      }
    });
  }
  for (auto& th : threads) {
    th.join();
  }
  return count.load();
}

std::vector<long long> parallel_fill(std::size_t n, unsigned k) {
  std::vector<long long> out(n, 0);
  if (n == 0) {
    return out;
  }
  const std::size_t workers = worker_count(n, k);
  std::vector<std::thread> threads;
  threads.reserve(workers);
  for (std::size_t t = 0; t < workers; ++t) {
    const Slice s = slice_of(n, workers, t);
    threads.emplace_back([&out, s] {
      for (std::size_t i = s.begin; i < s.end; ++i) {
        out[i] = static_cast<long long>(i) * 2;
      }
    });
  }
  for (auto& th : threads) {
    th.join();
  }
  return out;
}
