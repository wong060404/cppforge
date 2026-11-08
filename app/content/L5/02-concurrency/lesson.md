# 並發入門：thread、join 與分工的邊界

單執行緒的程式只有一個執行順序，所以「對」與「錯」很清楚。
多執行緒之後多了一整類錯誤：**錯誤只在某些排程下出現**。

## 最小可用範例

```cpp
#include <thread>
#include <vector>

std::vector<std::thread> workers;
for (unsigned t = 0; t < k; ++t) {
  workers.emplace_back([&, t] {  /* 做第 t 段 */ });
}
for (auto& w : workers) {
  w.join();          // 一定要 join
}
```

`join()` 有兩個作用：**等待完成**、**回收資源**。

漏掉 join 的後果不是「程式繼續跑」，而是：

> `std::thread` 解構時若仍 joinable → **`std::terminate`**

這是刻意的設計：編譯器逼你明確決定「等它」（`join`）還是「放生它」（`detach`）。

## 分工的兩個邊界

```cpp
const std::size_t chunk = n / k;      // 整數除法，會丟掉餘數
```

`n = 10, k = 3` 時 `chunk = 3`，三個執行緒覆蓋 9 個元素 —— **第 10 個被丟掉了**。

正確做法：

```cpp
const std::size_t chunk = n / k;
const std::size_t rem   = n % k;
// 前 rem 個執行緒各多分一個
const std::size_t len = chunk + (t < rem ? 1 : 0);
```

第二個邊界是 `k > n`：`n = 2, k = 4` 時會有兩個執行緒拿到空區段（甚至除以零）。
把實際執行緒數夾住：`workers = std::min<std::size_t>(k, n)`。

## 共享狀態：`++` 不是原子操作

```cpp
int counter = 0;
// 8 個執行緒各做 10000 次 ++counter
// 結果通常不是 80000
```

`++counter` 是「讀 → 加 → 寫」三步。兩個執行緒交錯時會**遺失更新**。

更嚴重的是：標準規定**資料競爭是未定義行為**。所以不能只說「會少算幾次」——
編譯器有權假設它不會發生，做出任何事。

解法：

```cpp
std::atomic<std::size_t> counter{0};
counter.fetch_add(1);                 // 原子
```

## 設計上避免共享，比加鎖更好

本節的 `parallel_sum` 刻意**不共享任何可寫狀態**：

```cpp
std::vector<long long> partial(workers, 0);   // 每個執行緒只寫自己的位置
// ... 各自算完
for (auto p : partial) total += p;            // 主執行緒合併
```

這樣完全不需要鎖，也不需要 atomic —— **資料不會被兩個執行緒同時碰到**。
這是多執行緒最重要的一條設計原則：讓共享的東西變成唯讀。

## 你要實作的部分

```cpp
long long parallel_sum(const std::vector<int>& v, unsigned k);
//   用 k 個執行緒分段求和；k > n 時夾到 n；餘數要分給前 n%k 個執行緒

std::size_t parallel_count(const std::vector<int>& v,
                           const std::function<bool(int)>& pred, unsigned k);
//   用 k 個執行緒計數；共享計數器必須用 std::atomic（評測會檢查原始碼）

std::vector<long long> parallel_fill(std::size_t n, unsigned k);
//   回傳長度 n 的 vector，其中 out[i] == i * 2；必須分工計算
```

起始碼三個地方漏了：`parallel_sum` 忽略餘數、`parallel_count` 用一般 `int`
累加（沒有 atomic，而且有 data race）、`parallel_fill` 每段少填最後一個 element。
