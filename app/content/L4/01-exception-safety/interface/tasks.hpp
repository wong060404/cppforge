#pragma once
// 這個介面不可修改：你只能實作它。
#include <functional>

// 在解構時執行一段清理動作（RAII guard）。
// 語意：
//   - 建構後 active() == true
//   - 解構時若仍 active()，執行 action **恰好一次**，且不拋例外
//   - release() 之後 active() == false，解構時不再執行
//   - 可以移動；移動後來源必須變成 active() == false
class ScopeGuard {
 public:
  explicit ScopeGuard(std::function<void()> action) noexcept;
  ~ScopeGuard() noexcept;

  ScopeGuard(const ScopeGuard&) = delete;
  ScopeGuard& operator=(const ScopeGuard&) = delete;
  ScopeGuard(ScopeGuard&& other) noexcept;
  ScopeGuard& operator=(ScopeGuard&& other) noexcept;

  void release() noexcept;
  bool active() const noexcept;

 private:
  std::function<void()> action_;
  bool active_;
};

// 方便回傳（練習移動語意）
ScopeGuard make_guard(std::function<void()> action);
